import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { ChatMessage } from './api.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  readonly newMessage$ = new Subject<ChatMessage>();

  connect(token: string): void {
    if (this.socket?.connected) return;

    const wsUrl = environment.apiUrl.replace('/api', '');
    this.socket = io(`${wsUrl}/messages`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('new_message', (msg: ChatMessage) => {
      this.newMessage$.next(msg);
      this.showBrowserNotification(msg);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  private showBrowserNotification(msg: ChatMessage): void {
    if (document.visibilityState === 'visible') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(`Nova mensagem de ${msg.from.name}`, {
      body: msg.content,
      icon: '/favicon.ico',
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
