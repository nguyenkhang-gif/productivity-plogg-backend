export const COMMUNITY_EVENT_PUBLISHER = 'COMMUNITY_EVENT_PUBLISHER';

export interface CommunityEvent {
  readonly guildId: string;
}

export interface CommunityEventPublisher {
  publish(event: CommunityEvent): void;
}

export function communityEventName(event: CommunityEvent): string {
  return (event.constructor as unknown as { eventName: string }).eventName;
}
