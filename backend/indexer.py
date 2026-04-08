import time
import asyncio
from web3 import Web3
from models import SessionLocal, MedicineBatch, TransferRecord, IndexerState, init_db

import os
from dotenv import load_dotenv

# Connect to Local Hardhat Node
ALCHEMY_URL = "http://127.0.0.1:8545"
w3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))

# Load the address from the frontend .env.local file dynamically
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", ".env.local")
load_dotenv(env_path)
ADDRESS = os.getenv("NEXT_PUBLIC_CONTRACT_ADDRESS")
if not ADDRESS:
    raise ValueError("NEXT_PUBLIC_CONTRACT_ADDRESS not found in frontend/.env.local")

CONTRACT_ADDRESS = Web3.to_checksum_address(ADDRESS)

import json
try:
    with open('../frontend/public/abi/MediChain.json', 'r') as f:
        config = json.load(f)
        ABI = config['medichain']['abi']
except Exception as e:
    print(f"Error loading ABI: {e}")
    exit(1)

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)

def sync_batch_state(batch_id, db):
    """Sync the core batch state from the blockchain to the DB."""
    try:
        data = contract.functions.verifyBatch(batch_id).call()
        batch = db.query(MedicineBatch).filter_by(batchId=batch_id).first()
        if not batch:
            batch = MedicineBatch(batchId=batch_id)
            db.add(batch)
        
        batch.medicineName = data[1]
        batch.manufacturer = data[2]
        batch.manufacturerAddr = data[3]
        batch.manufactureDate = data[4]
        batch.expiryDate = data[5]
        batch.quantity = data[6]
        batch.dispensedCount = data[7]
        batch.ipfsHash = data[8]
        batch.status = data[9]
        batch.exists = data[10]
        db.commit()
    except Exception as e:
        print(f"Error syncing batch {batch_id}: {e}")

async def run_indexer():
    init_db()
    db = SessionLocal()
    
    state = db.query(IndexerState).first()
    if not state:
        state = IndexerState(id=1, last_block=0)
        db.add(state)
        db.commit()
    
    print("Starting Indexer Engine...")
    
    while True:
        try:
            current_block = w3.eth.block_number
            if state.last_block < current_block:
                from_block = state.last_block + 1
                to_block = current_block
                
                # Fetch all logs in block range for contract
                logs = w3.eth.get_logs({
                    "fromBlock": from_block, 
                    "toBlock": to_block, 
                    "address": CONTRACT_ADDRESS
                })
                
                # Pre-fetch all real batch IDs from the contract and hash them for un-mapping
                try:
                    all_ids = contract.functions.getAllBatchIds().call()
                    hash_to_id = {Web3.keccak(text=bid).hex(): bid for bid in all_ids}
                except Exception as e:
                    hash_to_id = {}

                def get_batch_id(args_dict):
                    raw = args_dict.get('batchId')
                    if isinstance(raw, bytes):
                        return hash_to_id.get(raw.hex(), None)
                    return raw
                
                for log in logs:
                    # 1. Batch Registered
                    try:
                        event = contract.events.BatchRegistered().process_log(log)
                        batch_id = get_batch_id(event['args'])
                        if batch_id:
                            sync_batch_state(batch_id, db)
                    except Exception:
                        pass
                    
                    # 2. Batch Transferred
                    try:
                        event = contract.events.BatchTransferred().process_log(log)
                        args = event['args']
                        batch_id = get_batch_id(args)
                        
                        if batch_id:
                            block = w3.eth.get_block(log['blockNumber'])
                            
                            record = TransferRecord(
                                batchId=batch_id,
                                from_addr=args['from'],
                                to_addr=args['to'],
                                role=args['role'],
                                location=args['location'],
                                notes=args['notes'],
                                timestamp=block['timestamp']
                            )
                            db.add(record)
                            sync_batch_state(batch_id, db)
                    except Exception:
                        pass
                    
                    # 3. Batch Dispensed
                    try:
                        event = contract.events.BatchDispensed().process_log(log)
                        args = event['args']
                        batch_id = get_batch_id(args)
                        
                        if batch_id:
                            block = w3.eth.get_block(log['blockNumber'])
                            
                            record = TransferRecord(
                                batchId=batch_id,
                                from_addr=args['pharmacy'],
                                to_addr="0x0000000000000000000000000000000000000000",
                                role="PHARMACY-SOLD",
                                location="Pharmacy Counter",
                                notes=f"Dispensed {args['units']} units to patient",
                                timestamp=block['timestamp']
                            )
                            db.add(record)
                            sync_batch_state(batch_id, db)
                    except Exception:
                        pass

                state.last_block = to_block
                db.commit()
                print(f"Indexed up to block {to_block}")
                
        except Exception as e:
            print(f"Indexer Error: {e}")
            db.rollback()
            
        await asyncio.sleep(2)

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_indexer())
