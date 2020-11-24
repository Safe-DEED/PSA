import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { CipherText } from './cipher-text';
import { Context } from './context';
import { SecretKey } from './secret-key';
import { PlainText, PlainTextConstructorOptions } from './plain-text';
export declare type DecryptorDependencyOptions = {
    readonly Exception: Exception;
    readonly PlainText: PlainTextConstructorOptions;
};
export declare type DecryptorDependencies = {
    ({ Exception, PlainText }: DecryptorDependencyOptions): DecryptorConstructorOptions;
};
export declare type DecryptorConstructorOptions = {
    (context: Context, secretKey: SecretKey): Decryptor;
};
export declare type Decryptor = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly decrypt: (cipherText: CipherText, plainText?: PlainText) => PlainText | void;
    readonly invariantNoiseBudget: (cipherText: CipherText) => number;
};
export declare const DecryptorInit: ({ loader }: LoaderOptions) => DecryptorDependencies;
