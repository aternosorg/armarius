export default class Constants {
    /** @type {number} */ static MAX_UINT32 = 0xffffffff;
    /** @type {number} */ static MAX_UINT16 = 0xffff;

    /** @type {number} */ static SIGNATURE_LOCAL_FILE_HEADER = 0x04034b50;
    /** @type {number} */ static SIGNATURE_DATA_DESCRIPTOR = 0x08074b50;
    /** @type {number} */ static SIGNATURE_CENTRAL_DIR_FILE_HEADER = 0x02014b50;
    /** @type {number} */ static SIGNATURE_END_OF_CENTRAL_DIR = 0x06054b50;
    /** @type {number} */ static SIGNATURE_END_OF_CENTRAL_DIR_ZIP64 = 0x06064b50;
    /** @type {number} */ static SIGNATURE_END_OF_CENTRAL_DIR_LOCATOR_ZIP64 = 0x07064b50;

    /** @type {number} */ static LENGTH_DATA_DESCRIPTOR = 16;
    /** @type {number} */ static LENGTH_DATA_DESCRIPTOR_ZIP64 = 24;
    /** @type {number} */ static LENGTH_END_OF_CENTRAL_DIR = 22;
    /** @type {number} */ static LENGTH_CENTRAL_DIR_FILE_HEADER = 46;
    /** @type {number} */ static LENGTH_LOCAL_FILE_HEADER = 30;
    /** @type {number} */ static LENGTH_END_OF_CENTRAL_DIR_LOCATOR_ZIP64 = 20;
    /** @type {number} */ static LENGTH_END_OF_CENTRAL_DIR_ZIP64 = 56;

    /** @type {number} */ static COMPRESSION_METHOD_DEFLATE = 8;
    /** @type {number} */ static COMPRESSION_METHOD_STORE = 0;

    /** @type {number} */ static EXTRAFIELD_TYPE_ZIP64_EXTENDED_INFO = 0x0001;
    /** @type {number} */ static EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP = 0x5455;
    /** @type {number} */ static EXTRAFIELD_TYPE_UNICODE_FILENAME = 0x7075;
    /** @type {number} */ static EXTRAFIELD_TYPE_UNICODE_COMMENT = 0x6375;

    /** @type {number} */ static BITFLAG_DATA_DESCRIPTOR = 0b1000;
    /** @type {number} */ static BITFLAG_LANG_ENCODING = 0b100000000000;
    /** @type {number} */ static BITFLAG_MSDOS_DIR = 0b10000;

    /** @type {number} */ static MIN_VERSION_DEFLATE = 20;
    /** @type {number} */ static MIN_VERSION_ZIP64 = 45;

    /** @type {number} */ static DEFAULT_CHUNK_SIZE = 1024 * 512;
}
