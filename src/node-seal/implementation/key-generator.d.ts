import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { Context } from './context';
import { SecretKey, SecretKeyConstructorOptions } from './secret-key';
import { RelinKeys, RelinKeysConstructorOptions } from './relin-keys';
import { Serializable, SerializableConstructorOptions } from './serializable';
import { PublicKey, PublicKeyConstructorOptions } from './public-key';
import { GaloisKeys, GaloisKeysConstructorOptions } from './galois-keys';
export declare type KeyGeneratorDependencyOptions = {
    readonly Exception: Exception;
    readonly PublicKey: PublicKeyConstructorOptions;
    readonly SecretKey: SecretKeyConstructorOptions;
    readonly RelinKeys: RelinKeysConstructorOptions;
    readonly GaloisKeys: GaloisKeysConstructorOptions;
    readonly Serializable: SerializableConstructorOptions;
};
export declare type KeyGeneratorDependencies = {
    ({ Exception, PublicKey, SecretKey, RelinKeys, GaloisKeys, Serializable }: KeyGeneratorDependencyOptions): KeyGeneratorConstructorOptions;
};
export declare type KeyGeneratorConstructorOptions = {
    (context: Context, secretKey?: SecretKey): KeyGenerator;
};
export declare type KeyGenerator = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly secretKey: () => SecretKey;
    readonly publicKey: () => PublicKey;
    readonly relinKeysLocal: () => RelinKeys;
    readonly relinKeys: () => Serializable;
    readonly galoisKeysLocal: (steps?: Int32Array) => GaloisKeys;
    readonly galoisKeys: (steps?: Int32Array) => Serializable;
};
export declare const KeyGeneratorInit: ({ loader }: LoaderOptions) => KeyGeneratorDependencies;
