export interface Event {
    id: string;
    title: string;
    start: Date;
    end: Date;
    date: string;
    startTime: string;
    endTime: string;
    color?: string;
    resource?: any;
    [key: string]: any;
}
