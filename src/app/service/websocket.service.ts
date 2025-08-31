import { Injectable, NgZone } from '@angular/core';
import { Client, IFrame, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../env/environment';


@Injectable({ providedIn: 'root' })
export class WebSocketService {
  
  private wsUrl = environment.wsUrl;
  private client: Client;
  private connected = false;

  private videoIdSubject = new BehaviorSubject<string | null>(null);
  private titleSubject = new BehaviorSubject<string | null>(null);
  private progressSubject = new BehaviorSubject<number | null>(null);
  private errorSubject = new Subject<string>();
  private downloadUrlSubject = new BehaviorSubject<string | null>(null);
  private connectedSubject = new BehaviorSubject<boolean>(false);

  videoId$ = this.videoIdSubject.asObservable();
  title$ = this.titleSubject.asObservable();
  progress$ = this.progressSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  downloadUrl$ = this.downloadUrlSubject.asObservable();
  connected$ = this.connectedSubject.asObservable();

  constructor(private zone: NgZone) {
    this.client = new Client({
      brokerURL: this.wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    this.client.onConnect = (frame: IFrame) => {
      this.connected = true;
      this.zone.run(() => this.connectedSubject.next(true));
      console.log('✅ Connection to WebSocket established', frame.headers);

      const videoIdSubject = this.client.subscribe(
        '/queue/videoId', (message: IMessage) => {
          this.zone.run(
            () => this.videoIdSubject.next(message.body || null)
          );
        }
      )
      console.log('Subscribed to videoId queue with ID:', videoIdSubject.id);

      const titleSubject = this.client.subscribe(
        '/queue/title', (message: IMessage) => {
          this.zone.run(
            () => this.titleSubject.next(message.body || null)
          );
        }
      )
      console.log('Subscribed to title queue with ID:', titleSubject.id);

      const progressSubject = this.client.subscribe(
        '/queue/progress', (message: IMessage) => {
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
        }
      );
      console.log('Subscribed to progress queue with ID:', progressSubject.id);

      const errorSubject = this.client
        .subscribe('/queue/error', (message: IMessage) => {
          this.zone.run(
            () => this.errorSubject.next(message.body)
          );
        });
      console.log('Subscribed to error queue with ID:', errorSubject.id);

      const downloadLinkSubject = this.client
        .subscribe('/queue/mp3', (message: IMessage) => {
          this.zone.run(
            () => this.downloadUrlSubject.next(message.body || null)
          );
        });
      console.log('Subscribed to mp3 queue with ID:', downloadLinkSubject.id);
    };

    this.client.onDisconnect = () => {
      this.connected = false;
      this.zone.run(() => {
        this.connectedSubject.next(false);
      });
    };
  }

  connect() {
    if (this.connected || this.client.active) return;
    console.log('Attempting to connect to WebSocket...');
    this.client.activate();
  }

  startConversion(ytUrl: string, format: string) {
    if (!this.connected) {
      console.error('WebSocket not connected');
      return;
    }
    this.resetSubjects()
    this.client.publish({ 
        destination: '/app/convert', 
        body: ytUrl 
    });
  }

  disconnect() {
    if (this.client.active) {
      this.client.deactivate();
      this.connected = false;
      this.zone.run(() => this.connectedSubject.next(false));
    }
  }

  resetSubjects() {
    this.videoIdSubject.next(null)
    this.titleSubject.next(null)
    this.progressSubject.next(null)
    this.errorSubject.next("")
    this.downloadUrlSubject.next(null)
  }
}
