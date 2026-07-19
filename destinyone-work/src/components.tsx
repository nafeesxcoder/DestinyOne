import React from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, typeScale } from './theme';

const destinyOneLogo = require('../assets/destinyone-logo.png');

export function Brand({ small = false }: { small?: boolean }) {
  return <View style={styles.brand}><Image source={destinyOneLogo} resizeMode="cover" style={[styles.logoMark, small && styles.logoMarkSmall]}/><Text style={[styles.brandText, small && styles.brandTextSmall]}>Destiny<Text style={styles.brandOne}>One</Text></Text></View>;
}

export function Button({ label, onPress, variant='primary', icon, disabled }: {label:string; onPress?:()=>void; variant?:'primary'|'secondary'|'ghost'|'gold'; icon?:keyof typeof Ionicons.glyphMap; disabled?:boolean}) {
  const content=<>{icon&&<LinearGradient colors={variant==='gold'?['#F5E7C0',colors.gold,'#735317']:['#D85D7A',colors.pink,'#720B29']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.buttonIconBadge}><Ionicons name={icon} size={14} color="#FFFDFC"/></LinearGradient>}<Text style={[styles.buttonText,variant==='primary'&&{color:'#FFFDFC'},variant==='gold'&&{color:'#24171A'},variant==='ghost'&&{color:colors.muted}]}>{label}</Text></>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:!!disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[pressed&&{opacity:.9,transform:[{scale:.985}]},disabled&&{opacity:.45}]}>{variant==='primary'?<LinearGradient colors={['#C92C57',colors.pink,'#760B29']} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.button,styles.primary]}>{content}</LinearGradient>:<View style={[styles.button,styles[variant]]}>{content}</View>}</Pressable>;
}

export function Field({ label, error, ...inputProps }: any) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} accessibilityHint={error||undefined} placeholderTextColor="#6F6875" style={[styles.input,error&&styles.inputError]} {...inputProps} />{error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}</View>;
}

export function Chip({label, selected, onPress, gold}: {label:string;selected?:boolean;onPress?:()=>void;gold?:boolean}) {
  return <Pressable accessibilityRole={onPress?'button':'text'} accessibilityLabel={label} accessibilityState={onPress?{selected:!!selected}:undefined} onPress={onPress} style={[styles.chip,selected&&styles.chipSelected,gold&&styles.chipGold]}><Text style={[styles.chipText,selected&&!gold&&{color:'#FFFDFC'},gold&&{color:'#24171A'}]}>{label}</Text>{selected&&<LinearGradient colors={['#FFE8A3',colors.gold,'#4B3205']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.chipCheck}><Ionicons name="checkmark" size={10} color="#240B05"/></LinearGradient>}</Pressable>;
}

export function StepBar({step,total=5}:{step:number;total?:number}) { return <View style={styles.steps}>{Array.from({length:total}).map((_,i)=><View key={i} style={[styles.step,i<step&&styles.stepActive]}/>)}</View> }

export function SectionTitle({eyebrow,title,body}:{eyebrow?:string;title:string;body?:string}) { return <View style={{gap:8}}>{eyebrow&&<Text style={styles.eyebrow}>{eyebrow}</Text>}<Text style={styles.h1}>{title}</Text>{body&&<Text style={styles.body}>{body}</Text>}</View> }

export const shared = StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.black}, safe:{flex:1,width:'100%',maxWidth:860,alignSelf:'center',paddingHorizontal:18}, content:{flex:1,gap:20}, h1:{fontFamily:'Poppins_700Bold',fontSize:typeScale.display,lineHeight:36,letterSpacing:0,color:colors.ivory}, h2:{fontFamily:'Poppins_700Bold',fontSize:typeScale.title,lineHeight:28,letterSpacing:0,color:colors.ivory}, body:{fontFamily:'Poppins_400Regular',fontSize:typeScale.body,lineHeight:21,letterSpacing:0,color:colors.muted}, label:{fontFamily:'Poppins_600SemiBold',fontSize:typeScale.label,lineHeight:17,letterSpacing:0,color:colors.ivory}, card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,borderRadius:8,padding:16}, row:{flexDirection:'row',alignItems:'center'}, spacer:{flex:1}
});

const styles=StyleSheet.create({
  brand:{flexDirection:'row',alignItems:'center',gap:9},logoMark:{width:40,height:40,borderRadius:12,borderWidth:1,borderColor:'rgba(255,255,255,.22)',shadowColor:colors.pink,shadowOpacity:.5,shadowRadius:12},logoMarkSmall:{width:32,height:32,borderRadius:10},brandText:{fontFamily:'Poppins_700Bold',fontSize:24,letterSpacing:0,color:colors.ivory},brandTextSmall:{fontSize:20},brandOne:{color:colors.gold},
  button:{minHeight:50,borderRadius:radius.pill,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,paddingHorizontal:20},primary:{shadowColor:colors.pink,shadowOpacity:.20,shadowRadius:15,shadowOffset:{width:0,height:7}},secondary:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},ghost:{backgroundColor:'transparent'},gold:{backgroundColor:'#F8ECD0',borderWidth:1,borderColor:colors.gold},buttonIconBadge:{width:22,height:22,borderRadius:11,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.5)',shadowColor:colors.pink,shadowOpacity:.18,shadowRadius:8},buttonText:{fontFamily:'Poppins_700Bold',fontSize:typeScale.body,letterSpacing:0,color:colors.ivory},
  field:{gap:7,minWidth:0,width:'100%'},label:{fontFamily:'Poppins_600SemiBold',fontSize:typeScale.label,lineHeight:17,letterSpacing:0,color:colors.ivory}, input:{width:'100%',minWidth:0,height:51,borderRadius:radius.md,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface,color:colors.ivory,paddingHorizontal:15,fontFamily:'Poppins_400Regular',fontSize:typeScale.body,letterSpacing:0},inputError:{borderColor:colors.danger},error:{fontFamily:'Poppins_400Regular',fontSize:11,color:colors.danger},
  chip:{borderRadius:radius.pill,borderWidth:1,borderColor:colors.line,backgroundColor:'#FFFDFC',paddingHorizontal:14,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:5},chipSelected:{backgroundColor:'#8F1738',borderColor:colors.pinkSoft},chipGold:{backgroundColor:'#F8ECD0',borderColor:colors.gold},chipText:{color:colors.muted,fontFamily:'Poppins_600SemiBold',fontSize:12},chipCheck:{width:19,height:19,borderRadius:10,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.2)',shadowColor:colors.gold,shadowOpacity:.18,shadowRadius:8},
  steps:{height:4,flexDirection:'row',gap:5},step:{flex:1,backgroundColor:colors.line,borderRadius:5},stepActive:{backgroundColor:colors.pink,shadowColor:colors.pink,shadowOpacity:.55,shadowRadius:8},eyebrow:{fontFamily:'Poppins_700Bold',fontSize:typeScale.caption,letterSpacing:0,textTransform:'uppercase',color:colors.gold},h1:{fontFamily:'Poppins_700Bold',fontSize:27,lineHeight:34,letterSpacing:0,color:colors.ivory},body:{fontFamily:'Poppins_400Regular',fontSize:typeScale.body,lineHeight:21,letterSpacing:0,color:colors.muted}
});
