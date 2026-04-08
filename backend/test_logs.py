import json
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))
config = json.load(open('d:/Medichain/frontend/public/abi/MediChain.json'))
abi = config['medichain']['abi']
contract = w3.eth.contract(address=Web3.to_checksum_address('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'), abi=abi)

logs = w3.eth.get_logs({'address': contract.address, 'fromBlock': 0})
count = 0
for log in logs:
    try:
        e = contract.events.BatchRegistered().process_log(log)
        print('BatchRegistered batchId:', repr(e['args']['batchId']))
        count += 1
    except Exception:
        pass
print('total decoded', count)
