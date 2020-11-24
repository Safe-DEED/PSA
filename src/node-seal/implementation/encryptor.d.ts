import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { MemoryPoolHandle } from './memory-pool-handle';
import { CipherText, CipherTextConstructorOptions } from './cipher-text';
import { Context } from './context';
import { Serializable, SerializableConstructorOptions } from './serializable';
import { PublicKey } from './public-key';
import { SecretKey } from './secret-key';
import { PlainText } from './plain-text';
export declare type EncryptorDependencyOptions = {
    readonly Exception: Exception;
    readonly MemoryPoolHandle: MemoryPoolHandle;
    readonly CipherText: CipherTextConstructorOptions;
    readonly Serializable: SerializableConstructorOptions;
};
export declare type EncryptorDependencies = {
    ({ Exception, MemoryPoolHandle, CipherText, Serializable }: EncryptorDependencyOptions): EncryptorConstructorOptions;
};
export declare type EncryptorConstructorOptions = {
    (context: Context, publicKey: PublicKey, secretKey?: SecretKey): Encryptor;
};
export declare type Encryptor = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly encrypt: (plainText: PlainText, cipherText?: CipherText, pool?: MemoryPoolHandle) => CipherText | void;
    readonly encryptSymmetric: (plainText: PlainText, cipherText?: CipherText, pool?: MemoryPoolHandle) => CipherText | void;
    readonly encryptSymmetricSerializable: (plainText: PlainText, pool?: MemoryPoolHandle) => Serializable;
};
export declare const EncryptorInit: ({ loader }: LoaderOptions) => EncryptorDependencies;
