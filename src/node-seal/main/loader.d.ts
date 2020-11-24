import { Library } from '../implementation/seal';
export declare type Loader = {
    readonly library: Library;
};
export declare const createLoader: (bin: () => Promise<Library>) => Promise<Loader>;
