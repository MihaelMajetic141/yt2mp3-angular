import { Injectable, NgZone } from '@angular/core';
import { Client, IFrame, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private wsUrl = 'ws://localhost:8080/ws';
  private stompClient: Client;
  private connected = false;

  private progressSubject = new BehaviorSubject<number | null>(null);
  private errorSubject = new Subject<string>();
  private downloadUrlSubject = new BehaviorSubject<string | null>(null);
  private connectedSubject = new BehaviorSubject<boolean>(false);

  progress$ = this.progressSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  downloadUrl$ = this.downloadUrlSubject.asObservable();
  connected$ = this.connectedSubject.asObservable();

  constructor(private zone: NgZone) {
    this.stompClient = new Client({
      brokerURL: this.wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    this.stompClient.onConnect = (frame: IFrame) => {
      this.connected = true;
      this.zone.run(() => this.connectedSubject.next(true));
      console.log('✅ Connection to WebSocket established', frame.headers);

      const progressSub = this.stompClient.subscribe('/queue/progress', (message: IMessage) => {
        let value: number | null = null;
        try {
          const body = JSON.parse(message.body);
          value = typeof body === 'number' ? body : Number(body?.progress);
        } catch {
          value = Number(message.body);
        }
        if (Number.isFinite(value)) {
          this.zone.run(() => this.progressSubject.next(value as number));
        }
      });
      console.log('📡 Subscribed to progress queue with ID:', progressSub.id);

      const errorSub = this.stompClient.subscribe('/queue/error', (message: IMessage) => {
        this.zone.run(() => this.errorSubject.next(message.body));
      });
      console.log('📡 Subscribed to error queue with ID:', errorSub.id);

      const mp3Sub = this.stompClient.subscribe('/queue/mp3', (message: IMessage) => {
        this.zone.run(() => this.downloadUrlSubject.next(message.body || null));
      });
      console.log('📡 Subscribed to mp3 queue with ID:', mp3Sub.id);
    };

    this.stompClient.onDisconnect = () => {
      this.connected = false;
      this.zone.run(() => {
        this.connectedSubject.next(false);
      });
    };
  }

  connect() {
    if (this.connected || this.stompClient.active) return;
    console.log('Attempting to connect to WebSocket...');
    this.stompClient.activate();
  }

  startConversion(ytUrl: string) {
    if (!this.connected) {
      console.error('WebSocket not connected');
      return;
    }
    this.stompClient.publish({ destination: '/app/download', body: ytUrl });
  }

  disconnect() {
    if (this.stompClient.active) {
      this.stompClient.deactivate();
      this.connected = false;
      this.zone.run(() => this.connectedSubject.next(false));
    }
  }
}
