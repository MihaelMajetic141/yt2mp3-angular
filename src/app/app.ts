import { Component, OnInit, inject } from '@angular/core';
import { WebSocketService } from './service/websocket.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected title = 'yt2mp3';

  private ws = inject(WebSocketService);
  format: string = 'MP3';

  url = '';
  progress = toSignal(this.ws.progress$, { 
    initialValue: null });
  error = toSignal(this.ws.error$, { 
    initialValue: '' });
  downloadUrl = toSignal(this.ws.downloadUrl$, { 
    initialValue: null });
  connected = toSignal(this.ws.connected$, { 
    initialValue: false });

  ngOnInit() {
    this.ws.connect();
  }

  convert() {
    // this.ws.reset();
    // ToDo: start animation
    this.ws.startConversion(this.url, this.format);
  }
}
