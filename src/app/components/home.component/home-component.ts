import { Component, OnInit, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from '../../service/websocket.service';
import { toSignal } from '@angular/core/rxjs-interop';


@Component({
  selector: 'home-component',
  standalone: false,
  templateUrl: './home-component.html',
  styleUrl: './home-component.css',
})
export class HomeComponent implements OnInit {
  format: string = 'MP3';
  ws: WebSocketService = inject(WebSocketService)

  url = '';
  isLoading = false
  videoId = toSignal(this.ws.videoId$, {
    initialValue: null
  });
  title = toSignal(this.ws.title$, {
    initialValue: null
  })
  progress = toSignal(this.ws.progress$, {
    initialValue: null
  });
  error = toSignal(this.ws.error$, {
    initialValue: ''
  });
  downloadUrl = toSignal(this.ws.downloadUrl$, {
    initialValue: null
  });
  connected = toSignal(this.ws.connected$, {
    initialValue: false
  });

  constructor(private http: HttpClient) {
    effect(() => {
      if (this.downloadUrl()) {
        this.toggleLoading();
      }
    });
  }

  ngOnInit() {
    this.ws.connect();
  }

  convert() {
    // this.ws.reset();
    this.toggleLoading()
    this.ws.startConversion(this.url, this.format)
  }

  onDownloadClick(url: string) {
    this.http.get(url, { responseType: 'blob' }).subscribe(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${this.title()}.${this.format.toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    });
  }

  toggleLoading() {
    this.isLoading = !this.isLoading
  }
}
