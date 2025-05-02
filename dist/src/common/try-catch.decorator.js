"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TryCatch = void 0;
const TryCatch = () => {
    return (target, propertyKey, descriptor) => {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            try {
                return await originalMethod.apply(this, args);
            }
            catch (error) {
                const className = this.constructor.name;
                console.error(`Error in ${className}.${propertyKey}:`, error);
                console.error(`Arguments:`, args);
                throw error;
            }
        };
        return descriptor;
    };
};
exports.TryCatch = TryCatch;
