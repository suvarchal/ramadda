function insertText(c,b){var a=GuiUtils.getDomObject(c);if(a){insertAtCursor(a.obj,b)}}function insertAtCursor(d,c){var e=d.scrollTop;if(document.selection){d.focus();sel=document.selection.createRange();sel.text=c}else{if(d.selectionStart||d.selectionStart=="0"){var b=d.selectionStart;var a=d.selectionEnd;d.value=d.value.substring(0,b)+c+d.value.substring(a,d.value.length)}else{d.value+=c}}d.scrollTop=e}function insertTags(e,b,a,d){var c=GuiUtils.getDomObject(e);if(c){insertTagsInner(e,c.obj,b,a,d)}}function insertTagsInner(c,l,k,a,e){var d,g=false;k=k.replace(/&quote;/gi,'"');a=a.replace(/&quote;/gi,'"');k=k.replace(/newline/gi,"\n");a=a.replace(/newline/gi,"\n");if(l.selectionStart||l.selectionStart=="0"){var j=l.scrollTop;l.focus();var i=l.selectionStart;var b=l.selectionEnd;d=l.value.substring(i,b);l.value=l.value.substring(0,i)+k+d+a+l.value.substring(b,l.value.length);if(g){l.selectionStart=i+k.length;l.selectionEnd=i+k.length+d.length}else{l.selectionStart=i+k.length+d.length+a.length;l.selectionEnd=l.selectionStart-a.length}l.scrollTop=j;return}if(document.selection&&document.selection.createRange){if(document.documentElement&&document.documentElement.scrollTop){var f=document.documentElement.scrollTop}else{if(document.body){var f=document.body.scrollTop}}l.focus();var h=document.selection.createRange();d=h.text;h.text=k+d+a;if(g&&h.moveStart){if(window.opera){a=a.replace(/\n/g,"")}h.moveStart("character",-a.length-d.length);h.moveEnd("character",-a.length)}if(h.select){h.select()}if(document.documentElement&&document.documentElement.scrollTop){document.documentElement.scrollTop=f}else{if(document.body){document.body.scrollTop=f}}}};