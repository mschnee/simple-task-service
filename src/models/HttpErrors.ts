import * as HttpStatus from 'http-status-codes';

export class HttpError extends Error {
    public statusCode: number;
    constructor(code: number, message: string | undefined) {
        super(message);
        this.statusCode = code;
    }
}

export class NotAuthorized extends HttpError {
    constructor(message: string = HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED)) {
        super(HttpStatus.UNAUTHORIZED, message);
    }
}

export class NotFound extends HttpError {
    constructor(message: string = HttpStatus.getStatusText(HttpStatus.NOT_FOUND)) {
        super(HttpStatus.NOT_FOUND, message);
    }
}

export class NotAcceptable extends HttpError {
    constructor(message: string = HttpStatus.getStatusText(HttpStatus.NOT_ACCEPTABLE)) {
        super(HttpStatus.NOT_ACCEPTABLE, message);
    }
}

export class Conflict extends HttpError {
    constructor(message: string = HttpStatus.getStatusText(HttpStatus.CONFLICT)) {
        super(HttpStatus.CONFLICT, message);
    }
}
