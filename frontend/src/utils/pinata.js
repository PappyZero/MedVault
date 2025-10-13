import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
    pinataJwt: import.meta.env.PINATA_JWT,
    pinataGateway: import.meta.env.VITE_PINATA_GATEWAY,
});

export { pinata };
