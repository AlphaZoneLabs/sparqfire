import React,{useState} from 'react';
import { Text, View } from 'react-native';
import { AppShell } from '../src/components/AppShell';
import { Button, Card, Field, Notice, PageHeading } from '../src/components/ui';
import { styles,colors } from '../src/theme';
import { useAppState } from '../src/state/AppState';
export default function Clients(){const s=useAppState(),[open,setOpen]=useState(false),[name,setName]=useState(''),[sender,setSender]=useState(''),[error,setError]=useState('');
 async function save(){try{if(name.trim().length<2||sender.trim().length<2)throw new Error('Enter a client name and sender name.');await s.addWorkspace(name.trim(),sender.trim());setName('');setSender('');setOpen(false);setError('')}catch(e){setError((e as Error).message)}}
 return <AppShell><View style={styles.section}><PageHeading title="Clients" detail="Manage separate brand workspaces and control access to their data."/><View style={{alignSelf:'flex-start'}}><Button label={open?'Cancel':'+ Add client'} onPress={()=>setOpen(!open)}/></View>
 {open&&<Card style={{gap:12}}><Text style={styles.cardTitle}>New client workspace</Text><Field label="Business or organization name" value={name} onChangeText={setName} placeholder="Example: Northside Community Center"/><Field label="Default sender display name" value={sender} onChangeText={setSender} placeholder="Example: Community Team"/>{!!error&&<Notice danger>{error}</Notice>}<View style={{alignSelf:'flex-start'}}><Button label="Create workspace" onPress={()=>void save()}/></View></Card>}
 {s.workspaces.length?s.workspaces.map(w=><Card key={w.id} style={{gap:10}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><Text style={styles.cardTitle}>{w.name}</Text><Text style={styles.pillText}>{w.status.toUpperCase()}</Text></View><Text style={styles.label}>Sender: {w.sender_name}</Text><Text style={styles.label}>ID: {w.id}</Text><View style={{alignSelf:'flex-start'}}><Button label={s.activeId===w.id?'Selected client':'Select this client'} secondary onPress={()=>s.selectWorkspace(w.id)}/></View></Card>):<Notice>No clients yet. Create your first workspace above.</Notice>}
 <Text style={{color:colors.muted,fontSize:12}}>Each live workspace is authorized server-side. Switching client does not change another client's records.</Text></View></AppShell>}
