FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY shipment-1.py ./
CMD ["uvicorn", "shipment-1:app", "--host", "0.0.0.0", "--port", "8000"]
