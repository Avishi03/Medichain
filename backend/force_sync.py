from indexer import *
import asyncio

def go():
    init_db()
    db = SessionLocal()
    
    # 1. Sync all core batch items
    all_ids = contract.functions.getAllBatchIds().call()
    for bid in all_ids:
        print(f"Syncing batch details for {bid}...")
        sync_batch_state(bid, db)
        
    # 2. Iterate historical events strictly for transfer records
    print("Rebuilding transfer history...")
    from_block = 0
    to_block = w3.eth.block_number
    logs = w3.eth.get_logs({
        "fromBlock": from_block, 
        "toBlock": to_block, 
        "address": CONTRACT_ADDRESS
    })
    
    hash_to_id = {Web3.keccak(text=bid).hex(): bid for bid in all_ids}
    
    def get_batch_id(args_dict):
        raw = args_dict.get('batchId')
        if isinstance(raw, bytes):
            return hash_to_id.get(raw.hex(), None)
        return raw

    for log in logs:
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
        except Exception:
            pass
            
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
        except Exception:
            pass

    db.commit()
    print("Force Sync Complete!")

if __name__ == "__main__":
    go()
