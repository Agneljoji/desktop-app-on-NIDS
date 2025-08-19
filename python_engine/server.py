import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from scapy.all import sniff, IP, TCP, UDP, ICMP, get_if_list
import uvicorn
from threading import Thread
from queue import Queue

app = FastAPI()

origins = ["app://."]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

protocol_counts = {"TCP": 0, "UDP": 0, "ICMP": 0, "Other": 0}

def process_packet(packet, packet_queue: Queue):
    global protocol_counts
    if packet.haslayer(IP):
        proto = "Other"
        if packet.haslayer(TCP): proto = "TCP"
        elif packet.haslayer(UDP): proto = "UDP"
        elif packet.haslayer(ICMP): proto = "ICMP"
        protocol_counts[proto] += 1
        
        packet_info = {
            "protocol_counts": protocol_counts,
            "log": f"Packet: {packet.summary()}"
        }
        # Put the processed data into the thread-safe queue
        packet_queue.put(packet_info)

def run_sniffer(packet_queue: Queue, loop):
    try:
        interfaces = get_if_list()
        print(f"Sniffing on interfaces: {interfaces}")
        sniff(iface=interfaces, prn=lambda pkt: process_packet(pkt, packet_queue), store=0)
    except Exception as e:
        # If Scapy fails, send a specific error message to the frontend
        error_message = {
            "error": f"Failed to start packet sniffer. Please ensure Npcap is installed and run the application as an administrator. Details: {e}"
        }
        # Use run_coroutine_threadsafe to send from this thread
        asyncio.run_coroutine_threadsafe(websocket.send_json(error_message), loop)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connection established.")
    
    packet_queue = Queue()
    loop = asyncio.get_event_loop()
    
    # Start the sniffer in a separate thread
    sniffer_thread = Thread(target=run_sniffer, args=(packet_queue, loop), daemon=True)
    sniffer_thread.start()
    
    try:
        while True:
            # Check the queue for new data without blocking
            if not packet_queue.empty():
                packet_info = packet_queue.get()
                await websocket.send_json(packet_info)
            await asyncio.sleep(0.1) # Small delay to prevent high CPU usage
    except Exception as e:
        print(f"WebSocket connection closed: {e}")
    finally:
        print("Client disconnected.")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)