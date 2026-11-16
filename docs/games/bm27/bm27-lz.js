/* BM27 v2.9.3 — compact save storage.
   LZ-based compression (same scheme as the MIT-licensed lz-string library, UTF-16 variant)
   so career saves take a fraction of the browser's ~5 MB storage. */
(()=>{'use strict';
if(window.BM27LZ)return;
const f=String.fromCharCode;
function compress(uncompressed,bitsPerChar,getCharFromInt){
  if(uncompressed==null)return '';
  let i,value,context_dictionary={},context_dictionaryToCreate={},context_c='',context_wc='',context_w='',context_enlargeIn=2,context_dictSize=3,context_numBits=2,context_data=[],context_data_val=0,context_data_position=0,ii;
  const put=bit=>{context_data_val=(context_data_val<<1)|bit;if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0}else context_data_position++};
  const putBits=(v,n)=>{for(i=0;i<n;i++){put(v&1);v>>=1}};
  const emitW=()=>{
    if(Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)){
      if(context_w.charCodeAt(0)<256){for(i=0;i<context_numBits;i++)put(0);putBits(context_w.charCodeAt(0),8)}
      else{value=1;for(i=0;i<context_numBits;i++){put(value);value=0}putBits(context_w.charCodeAt(0),16)}
      context_enlargeIn--;if(context_enlargeIn==0){context_enlargeIn=Math.pow(2,context_numBits);context_numBits++}
      delete context_dictionaryToCreate[context_w];
    }else putBits(context_dictionary[context_w],context_numBits);
    context_enlargeIn--;if(context_enlargeIn==0){context_enlargeIn=Math.pow(2,context_numBits);context_numBits++}
  };
  for(ii=0;ii<uncompressed.length;ii+=1){
    context_c=uncompressed.charAt(ii);
    if(!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)){context_dictionary[context_c]=context_dictSize++;context_dictionaryToCreate[context_c]=true}
    context_wc=context_w+context_c;
    if(Object.prototype.hasOwnProperty.call(context_dictionary,context_wc))context_w=context_wc;
    else{emitW();context_dictionary[context_wc]=context_dictSize++;context_w=String(context_c)}
  }
  if(context_w!=='')emitW();
  putBits(2,context_numBits);
  while(true){context_data_val=(context_data_val<<1);if(context_data_position==bitsPerChar-1){context_data.push(getCharFromInt(context_data_val));break}else context_data_position++}
  return context_data.join('');
}
function decompress(length,resetValue,getNextValue){
  let dictionary=[],enlargeIn=4,dictSize=4,numBits=3,entry='',result=[],i,w,bits,resb,maxpower,power,c,data={val:getNextValue(0),position:resetValue,index:1};
  const read=n=>{bits=0;maxpower=Math.pow(2,n);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++)}bits|=(resb>0?1:0)*power;power<<=1}return bits};
  for(i=0;i<3;i+=1)dictionary[i]=i;
  switch(read(2)){case 0:c=f(read(8));break;case 1:c=f(read(16));break;case 2:return ''}
  dictionary[3]=c;w=c;result.push(c);
  while(true){
    if(data.index>length)return '';
    c=read(numBits);
    switch(c){case 0:dictionary[dictSize++]=f(read(8));c=dictSize-1;enlargeIn--;break;case 1:dictionary[dictSize++]=f(read(16));c=dictSize-1;enlargeIn--;break;case 2:return result.join('')}
    if(enlargeIn==0){enlargeIn=Math.pow(2,numBits);numBits++}
    if(dictionary[c])entry=dictionary[c];else if(c===dictSize)entry=w+w.charAt(0);else return null;
    result.push(entry);dictionary[dictSize++]=w+entry.charAt(0);enlargeIn--;w=entry;
    if(enlargeIn==0){enlargeIn=Math.pow(2,numBits);numBits++}
  }
}
const compressToUTF16=s=>s==null?'':compress(s,15,a=>f(a+32))+' ';
const decompressFromUTF16=s=>s==null?'':s===''?null:decompress(s.length,16384,i=>s.charCodeAt(i)-32);
window.BM27LZ={compressToUTF16,decompressFromUTF16};
})();
