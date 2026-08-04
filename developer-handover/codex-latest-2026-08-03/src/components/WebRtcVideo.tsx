import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export function WebRtcVideo({stream,muted=false,mirror=false}:{stream:MediaStream|null;muted?:boolean;mirror?:boolean}){
  const element=useRef<HTMLVideoElement|null>(null);
  useEffect(()=>{if(element.current)element.current.srcObject=stream;return()=>{if(element.current)element.current.srcObject=null}},[stream]);
  if(Platform.OS!=='web'||!stream)return null;
  return React.createElement('video',{
    ref:(node:HTMLVideoElement|null)=>{element.current=node},
    autoPlay:true,
    playsInline:true,
    muted,
    style:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transform:mirror?'scaleX(-1)':undefined},
  });
}
