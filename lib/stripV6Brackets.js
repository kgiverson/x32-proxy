/**
 * Strip brackets from formatted IPv6 address, if applicable.
 * @param {string} s 
 */
export default function stripV6Brackets(s) {
  return s.replace(/^\[([^\]]+)\]$/, '$1');
}