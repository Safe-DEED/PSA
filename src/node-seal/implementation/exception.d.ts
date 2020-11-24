import { LoaderOptions } from './seal';
export declare type ExceptionDependencies = {
    (): ExceptionConstructorOptions;
};
export declare type ExceptionConstructorOptions = {
    (): Exception;
};
export declare type Exception = {
    readonly safe: (error: number | Error | string) => Error;
};
export declare const ExceptionInit: ({ loader }: LoaderOptions) => ExceptionDependencies;
