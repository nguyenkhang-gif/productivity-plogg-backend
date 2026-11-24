import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CommunityEvent,
  CommunityEventPublisher,
  communityEventName,
} from 'src/modules/community/shared/domain/community-event-publisher';

@Injectable()
export class EventEmitterCommunityEventPublisher
  implements CommunityEventPublisher
{
  constructor(private readonly emitter: EventEmitter2) {}

  publish(event: CommunityEvent): void {
    this.emitter.emit(communityEventName(event), event);
  }
}
