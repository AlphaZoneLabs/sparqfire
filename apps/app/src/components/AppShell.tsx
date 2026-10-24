import React from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Brand, MiniBrand } from './Brand';
import { colors, styles } from '../theme';
import { useAppState } from '../state/AppState';

type IconName=React.ComponentProps<typeof Ionicons>['name'];
const routes:{href:string;title:string;icon:IconName}[]=[
 {href:'/',title:'Overview',icon:'grid-outline'},
 {href:'/clients',title:'Clients',icon:'business-outline'},
 {href:'/contacts',title:'Contacts',icon:'people-outline'},
 {href:'/campaigns',title:'Campaigns',icon:'mail-outline'},
 {href:'/domains',title:'Domains',icon:'globe-outline'},
 {href:'/settings',title:'Settings',icon:'settings-outline'},
];
export function AppShell({children}:{children:React.ReactNode}){
 const router=useRouter(),pathname=usePathname(),{width}=useWindowDimensions(),wide=width>=800;
 const state=useAppState();
 const menu=wide?routes:routes.slice(0,5);
 return <SafeAreaView style={{flex:1,backgroundColor:colors.background}}><View style={{flex:1,flexDirection:'row'}}>
 {wide&&<View style={{width:232,backgroundColor:colors.surface,borderRightWidth:1,borderColor:colors.border,padding:18,gap:25}}>
  <Brand/>
  <View style={{gap:5}}>{routes.map(route=>{
   const selected=pathname===route.href;return <Pressable key={route.href} accessibilityRole="button" accessibilityLabel={route.title} onPress={()=>router.push(route.href as never)} style={{padding:12,borderRadius:11,backgroundColor:selected?colors.elevated:'transparent',flexDirection:'row',gap:12,alignItems:'center'}}><Ionicons name={route.icon} size={19} color={selected?colors.accent:colors.muted}/><Text style={{color:selected?colors.text:colors.muted,fontWeight:selected?'700':'500'}}>{route.title}</Text></Pressable>
  })}</View>
  <View style={{flex:1}}/>
  <Text style={{color:colors.muted,fontSize:12}}>SparQFire v0.1 • Foundation</Text>
 </View>}
 <View style={{flex:1}}>
  <View style={{height:66,borderBottomWidth:1,borderColor:colors.border,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   {wide?<Text style={{color:colors.text,fontSize:14,fontWeight:'700'}}>Agency Marketing Console</Text>:<MiniBrand/>}
   <Pressable onPress={()=>router.push('/settings' as never)} style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={{color:state.demo?colors.warning:colors.success,fontSize:12,fontWeight:'700'}}>{state.demo?'DEMO MODE':'LIVE WORKSPACE'}</Text><Ionicons name="person-circle-outline" size={26} color={colors.muted}/></Pressable>
  </View>
  <ScrollView style={{flex:1}} contentContainerStyle={{flexGrow:1}} keyboardShouldPersistTaps="handled">{children}</ScrollView>
  {!wide&&<View style={{flexDirection:'row',borderTopWidth:1,borderColor:colors.border,backgroundColor:colors.surface,paddingVertical:12}}>{menu.map(route=>{const selected=pathname===route.href;return <Pressable key={route.href} onPress={()=>router.push(route.href as never)} accessibilityRole="tab" accessibilityState={{selected}} style={{flex:1,alignItems:'center',gap:4}}><Ionicons name={route.icon} size={22} color={selected?colors.accent:colors.muted}/><Text style={{color:selected?colors.accent:colors.muted,fontSize:10}}>{route.title}</Text></Pressable>})}</View>}
 </View></View></SafeAreaView>
}
export function WorkspaceSelect(){const {workspaces,activeId,selectWorkspace}=useAppState();return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingVertical:3}}>{workspaces.map(ws=><Pressable key={ws.id} accessibilityRole="button" onPress={()=>selectWorkspace(ws.id)} style={[styles.pill,{backgroundColor:activeId===ws.id?colors.accentSoft:colors.elevated,borderWidth:1,borderColor:activeId===ws.id?colors.accent:colors.border,paddingVertical:9}]}><Text style={{color:activeId===ws.id?colors.text:colors.muted,fontWeight:'700',fontSize:12}}>{ws.name}</Text></Pressable>)}</ScrollView>}
