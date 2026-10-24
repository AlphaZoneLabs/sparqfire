import React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, ViewStyle } from 'react-native';
import { colors, styles } from '../theme';

export function Card({ children, style }: {children: React.ReactNode; style?: ViewStyle}) { return <View style={[styles.card, style]}>{children}</View>; }
export function Button({ label, onPress, secondary, disabled }: {label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[secondary?styles.ghost:styles.action,disabled&&{opacity:.55}]}><Text style={secondary?styles.ghostText:styles.actionText}>{label}</Text></Pressable>;
}
export function Field({label,value,onChangeText,placeholder,secureTextEntry,keyboardType,multiline}: {label:string;value:string;onChangeText:(value:string)=>void;placeholder?:string;secureTextEntry?:boolean;keyboardType?:'email-address'|'default';multiline?:boolean}) {
  return <View style={{gap:7}}><Text style={styles.label}>{label}</Text><TextInput autoCapitalize={keyboardType==='email-address'?'none':'sentences'} autoCorrect={false} accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={colors.muted} style={[styles.input,multiline&&{minHeight:110,textAlignVertical:'top'}]} value={value} onChangeText={onChangeText} secureTextEntry={secureTextEntry} keyboardType={keyboardType} multiline={multiline}/></View>;
}
export function PageHeading({title,detail}: {title:string;detail:string}) {return <View style={{gap:6}}><Text style={styles.heading}>{title}</Text><Text style={styles.subheading}>{detail}</Text></View>}
export function Notice({children,danger}: {children:React.ReactNode;danger?:boolean}) {return <View style={{backgroundColor:danger?'#452932':colors.accentSoft,padding:13,borderRadius:12}}><Text style={{color:danger?colors.danger:'#ffccab',lineHeight:20}}>{children}</Text></View>}
export function Loading() {return <ActivityIndicator color={colors.accent} size="large" style={{margin:28}}/>}
