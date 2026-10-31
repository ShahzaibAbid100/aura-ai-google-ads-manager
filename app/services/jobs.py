from sqlalchemy.orm import Session

from app.models.entities import ExecutionJob


def create_job(db: Session, kind: str, input_data: dict) -> ExecutionJob:
    job = ExecutionJob(kind=kind, status="queued", input_data=input_data)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def finish_job(db: Session, job: ExecutionJob, result: dict) -> ExecutionJob:
    job.status = "completed"
    job.result = result
    db.commit()
    db.refresh(job)
    return job
