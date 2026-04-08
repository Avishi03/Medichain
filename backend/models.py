from sqlalchemy import Column, String, Integer, BigInteger, Boolean, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class MedicineBatch(Base):
    __tablename__ = "medicine_batches"
    
    batchId = Column(String, primary_key=True, index=True)
    medicineName = Column(String)
    manufacturer = Column(String)
    manufacturerAddr = Column(String)
    manufactureDate = Column(BigInteger)
    expiryDate = Column(BigInteger)
    quantity = Column(BigInteger)
    dispensedCount = Column(BigInteger, default=0)
    ipfsHash = Column(String)
    status = Column(Integer)  # BatchStatus enum (0-4)
    exists = Column(Boolean, default=True)

class TransferRecord(Base):
    __tablename__ = "transfer_records"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    batchId = Column(String, index=True)
    from_addr = Column(String)
    to_addr = Column(String)
    role = Column(String)
    timestamp = Column(BigInteger)
    location = Column(String)
    notes = Column(String)

class IndexerState(Base):
    __tablename__ = "indexer_state"
    
    id = Column(Integer, primary_key=True)
    last_block = Column(BigInteger)


DATABASE_URL = "sqlite:///./medichain.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
