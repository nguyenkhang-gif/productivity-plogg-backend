// JSON.stringify không biết serialize BigInt (ném TypeError → 500). Permission
// bitmask (bigint) ở tầng wire luôn hiểu là string, nên convert mặc định.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
