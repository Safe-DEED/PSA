import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { PlainText, PlainTextConstructorOptions } from './plain-text';
import { Context } from './context';
export declare type IntegerEncoderDependencyOptions = {
    readonly Exception: Exception;
    readonly PlainText: PlainTextConstructorOptions;
};
export declare type IntegerEncoderDependencies = {
    ({ Exception, PlainText }: IntegerEncoderDependencyOptions): IntegerEncoderConstructorOptions;
};
export declare type IntegerEncoderConstructorOptions = {
    (context: Context): IntegerEncoder;
};
export declare type IntegerEncoder = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly encodeInt32: (value: number, destination?: PlainText) => PlainText | void;
    readonly encodeUint32: (value: number, destination?: PlainText) => PlainText | void;
    readonly decodeInt32: (plainText: PlainText) => number;
    readonly decodeUint32: (plainText: PlainText) => number;
};
export declare const IntegerEncoderInit: ({ loader }: LoaderOptions) => IntegerEncoderDependencies;
