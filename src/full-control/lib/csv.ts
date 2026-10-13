export function csvContent(rows: ReadonlyArray<ReadonlyArray<unknown>>) {
 return '\ufeff'+rows.map(row=>row.map(value=>{const text=value==null?'':String(value);return '"'+(/^[\s]*[=+\-@]/.test(text)?"'"+text:text).replaceAll('"','""')+'"';}).join(';')).join('\r\n');
}
