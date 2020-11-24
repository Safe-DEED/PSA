import { SEALLibrary } from '../implementation/seal';
import { Loader } from './loader';
export declare const SEAL: (Loader: () => Promise<Loader>) => Promise<SEALLibrary>;
