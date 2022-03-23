/*
Simply replacing BigInt works in the context of this library,
as all the values read as BigInt can only be used as regular Numbers anyway,
since both DataView and FileReader do not support BigInt offset and length parameters.
 */
export default (typeof BigInt === 'function' ? BigInt : Number);
