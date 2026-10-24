import React,{useState} from 'react';
import { View,Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Brand } from '../src/components/Brand';
import { Button,Card,Field,Notice } from '../src/components/ui';
import { useAppState } from '../src/state/AppState';
import { colors } from '../src/theme';
export default function Login(){const s=useAppState(),router=useRouter(),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState('');async function submit(){try{setError('');await s.login(email,password);router.replace('/' as never)}catch(e){setError((e as Error).message)}}return <View style={{flex:1,backgroundColor:colors.background,padding:20,alignItems:'center',justifyContent:'center'}}><View style={{width:'100%',maxWidth:410,gap:18}}><Brand/><Card style={{gap:15}}><Text style={{color:colors.text,fontSize:24,fontWeight:'800'}}>Sign in to SparQFire</Text><Text style={{color:colors.muted}}>Use the owner account created with the secure Worker setup endpoint.</Text><Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address"/><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry/>{!!error&&<Notice danger>{error}</Notice>}<Button label={s.loading?'Signing in…':'Sign in'} disabled={s.loading} onPress={()=>void submit()}/><Button label="Return to demo" secondary onPress={()=>router.replace('/' as never)}/></Card></View></View>}
