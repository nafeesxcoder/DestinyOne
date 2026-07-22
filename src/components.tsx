import React from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from './theme';

const destinyOneLogo = require('../assets/destinyone-logo.png');

export function Brand({ small = false }: { small?: boolean }) {
  return <View style={styles.brand}><Image source={destinyOneLogo} resizeMode="cover" style={[styles.logoMark, small && styles.logoMarkSmall]}/><Text style={[styles.brandText, small && {fontSize:22}]}>Destiny<Text style={styles.brandOne}>One</Text></Text></View>;
}

export function Button({ label, onPress, variant='primary', icon, disabled }: {label:string; onPress?:()=>void; variant?:'primary'|'secondary'|'ghost'|'gold'; icon?:keyof typeof Ionicons.glyphMap; disabled?:boolean}) {
  const content=<>{icon&&<LinearGradient colors={variant==='gold'?['#FFE8A3',colors.gold,'#4B3205']:['#FFFFFF','#FF6E80',colors.pink]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.buttonIconBadge}><Ionicons name={icon} size={14} color={variant==='gold'?'#240B05':colors.ivory}/></LinearGradient>}<Text style={[styles.buttonText,variant==='ghost'&&{color:colors.muted}]}>{label}</Text></>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:!!disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[pressed&&{opacity:.9,transform:[{scale:.985}]},disabled&&{opacity:.45}]}>{variant==='primary'?<LinearGradient colors={['#FF314D',colors.pink,'#8C001C']} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.button,styles.primary]}>{content}</LinearGradient>:<View style={[styles.button,styles[variant]]}>{content}</View>}</Pressable>;
}

export function Field({ label, error, ...inputProps }: any) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} accessibilityHint={error||undefined} placeholderTextColor="#6F6875" style={[styles.input,error&&styles.inputError]} {...inputProps} />{error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}</View>;
}

export function Chip({label, selected, onPress, gold}: {label:string;selected?:boolean;onPress?:()=>void;gold?:boolean}) {
  return <Pressable accessibilityRole={onPress?'button':'text'} accessibilityLabel={label} accessibilityState={onPress?{selected:!!selected}:undefined} onPress={onPress} style={[styles.chip,selected&&styles.chipSelected,gold&&styles.chipGold]}><Text style={[styles.chipText,(selected||gold)&&{color:colors.ivory}]}>{label}</Text>{selected&&<LinearGradient colors={['#FFE8A3',colors.gold,'#4B3205']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.chipCheck}><Ionicons name="checkmark" size={10} color="#240B05"/></LinearGradient>}</Pressable>;
}

export function StepBar({step,total=5}:{step:number;total?:number}) { return <View style={styles.steps}>{Array.from({length:total}).map((_,i)=><View key={i} style={[styles.step,i<step&&styles.stepActive]}/>)}</View> }

export function SectionTitle({eyebrow,title,body}:{eyebrow?:string;title:string;body?:string}) { return <View style={{gap:8}}>{eyebrow&&<Text style={styles.eyebrow}>{eyebrow}</Text>}<Text style={styles.h1}>{title}</Text>{body&&<Text style={styles.body}>{body}</Text>}</View> }

export const shared = StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.black}, safe:{flex:1,width:'100%',maxWidth:860,alignSelf:'center',paddingHorizontal:22}, content:{flex:1,gap:24}, h1:{fontFamily:'Poppins_700Bold',fontSize:38,lineHeight:45,color:colors.ivory}, h2:{fontFamily:'Poppins_700Bold',fontSize:27,color:colors.ivory}, body:{fontFamily:'Poppins_400Regular',fontSize:15,lineHeight:23,color:colors.muted}, label:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:colors.ivory}, card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,borderRadius:radius.lg,padding:20}, row:{flexDirection:'row',alignItems:'center'}, spacer:{flex:1}
});

const styles=StyleSheet.create({
  brand:{flexDirection:'row',alignItems:'center',gap:10},logoMark:{width:44,height:44,borderRadius:14,borderWidth:1,borderColor:'rgba(255,255,255,.22)',shadowColor:colors.pink,shadowOpacity:.5,shadowRadius:12},logoMarkSmall:{width:34,height:34,borderRadius:11},brandText:{fontFamily:'Poppins_700Bold',fontSize:27,color:colors.ivory},brandOne:{color:colors.gold},
  button:{minHeight:54,borderRadius:radius.pill,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9,paddingHorizontal:22},primary:{shadowColor:colors.pink,shadowOpacity:.32,shadowRadius:15,shadowOffset:{width:0,height:7}},secondary:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},ghost:{backgroundColor:'transparent'},gold:{backgroundColor:'#5A4310',borderWidth:1,borderColor:colors.gold},buttonIconBadge:{width:24,height:24,borderRadius:12,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.22)',shadowColor:colors.pink,shadowOpacity:.28,shadowRadius:8},buttonText:{fontFamily:'Poppins_700Bold',fontSize:15,color:colors.ivory},
  field:{gap:8,minWidth:0,width:'100%'},label:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:colors.ivory}, input:{width:'100%',minWidth:0,height:55,borderRadius:radius.md,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface,color:colors.ivory,paddingHorizontal:17,fontFamily:'Poppins_400Regular',fontSize:15},inputError:{borderColor:colors.danger},error:{fontFamily:'Poppins_400Regular',fontSize:11.5,color:colors.danger},
  chip:{borderRadius:radius.pill,borderWidth:1,borderColor:colors.line,backgroundColor:'rgba(43,10,17,.92)',paddingHorizontal:14,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:5},chipSelected:{backgroundColor:'#9B0A25',borderColor:colors.pinkSoft},chipGold:{backgroundColor:'#3B0C13',borderColor:colors.pink},chipText:{color:colors.muted,fontFamily:'Poppins_600SemiBold',fontSize:12},chipCheck:{width:19,height:19,borderRadius:10,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.2)',shadowColor:colors.gold,shadowOpacity:.28,shadowRadius:8},
  steps:{height:5,flexDirection:'row',gap:5},step:{flex:1,backgroundColor:colors.line,borderRadius:5},stepActive:{backgroundColor:colors.pink,shadowColor:colors.pink,shadowOpacity:.55,shadowRadius:8},eyebrow:{fontFamily:'Poppins_700Bold',fontSize:11,letterSpacing:1.8,textTransform:'uppercase',color:colors.gold},h1:{fontFamily:'Poppins_700Bold',fontSize:34,lineHeight:41,color:colors.ivory},body:{fontFamily:'Poppins_400Regular',fontSize:15,lineHeight:23,color:colors.muted}
});
