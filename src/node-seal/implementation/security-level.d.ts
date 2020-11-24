import { LoaderOptions } from './seal';
export declare type SecurityLevelDependencies = {
    (): SecurityLevelConstructorOptions;
};
export declare type SecurityLevelConstructorOptions = {
    (): SecurityLevel;
};
export declare type SecurityLevel = {
    readonly none: any;
    readonly tc128: any;
    readonly tc192: any;
    readonly tc256: any;
};
export declare const SecurityLevelInit: ({ loader }: LoaderOptions) => SecurityLevelDependencies;
