export const TryCatch = (): any => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const className = this.constructor.name;
        console.error(`Error in ${className}.${propertyKey}:`, error);
        console.error(`Arguments:`, args);
        throw error;
      }
    };

    return descriptor;
  };
};
