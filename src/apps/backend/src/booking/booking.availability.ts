import { Injectable } from '@nestjs/common'
import { Subject } from 'rxjs'
import type { AvailabilityEvent } from './booking.types.js'

@Injectable()
export class BookingAvailabilityService {
	private readonly subject = new Subject<AvailabilityEvent>()

	publish(event: AvailabilityEvent) {
		this.subject.next(event)
	}

	stream() {
		return this.subject.asObservable()
	}
}
