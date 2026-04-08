from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from models import SessionLocal, MedicineBatch, TransferRecord, init_db

app = FastAPI(title="MediChain Python API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # allow typical nextjs localhost configurations
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/api/batches/{batch_id}")
def get_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(MedicineBatch).filter_by(batchId=batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    history = db.query(TransferRecord).filter_by(batchId=batch_id).order_by(TransferRecord.timestamp.asc()).all()
    
    return {
        "batch": {
            "batchId": batch.batchId,
            "medicineName": batch.medicineName,
            "manufacturer": batch.manufacturer,
            "manufacturerAddr": batch.manufacturerAddr,
            "manufactureDate": batch.manufactureDate,
            "expiryDate": batch.expiryDate,
            "quantity": batch.quantity,
            "dispensedCount": batch.dispensedCount,
            "ipfsHash": batch.ipfsHash,
            "status": batch.status,
            "exists": batch.exists
        },
        "history": [
            {
                "from": rec.from_addr,
                "to": rec.to_addr,
                "role": rec.role,
                "timestamp": rec.timestamp,
                "location": rec.location,
                "notes": rec.notes
            } for rec in history
        ]
    }

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total_batches = db.query(MedicineBatch).count()
    total_transfers = db.query(TransferRecord).count() 
    return {
        "totalBatches": total_batches,
        "totalTransfers": total_transfers,
        "totalRecalls": db.query(MedicineBatch).filter_by(status=4).count()
    }
