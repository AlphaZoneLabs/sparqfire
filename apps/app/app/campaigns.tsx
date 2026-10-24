import React,{useState} from 'react';
import { Text,View } from 'react-native';
import { AppShell,WorkspaceSelect } from '../src/components/AppShell';
import { Button,Card,Field,Notice,PageHeading } from '../src/components/ui';
import { styles } from '../src/theme';
import { useAppState } from '../src/state/AppState';
export default function Campaigns(){const s=useAppState(),[open,setOpen]=useState(false),[name,setName]=useState(''),[subject,setSubject]=useState(''),[error,setError]=useState('');
 async function save(){try{if(name.trim().length<2||subject.trim().length<2)throw new Error('Enter a campaign name and email subject.');await s.addCampaign({name:name.trim(),subject:subject.trim()});setOpen(false);setName('');setSubject('');setError('')}catch(e){setError((e as Error).message)}}
 return <AppShell><View style={styles.section}><PageHeading title="Campaigns" detail="Create safe drafts now; sending will be added after deliverability and compliance controls."/><WorkspaceSelect/><View style={{alignSelf:'flex-start'}}><Button label={open?'Cancel':'+ New draft'} onPress={()=>setOpen(!open)} disabled={!s.activeId}/></View>
 {open&&<Card style={{gap:12}}><Text style={styles.cardTitle}>New campaign draft</Text><Field label="Internal campaign name" value={name} onChangeText={setName} placeholder="Fall Newsletter"/><Field label="Email subject" value={subject} onChangeText={setSubject} placeholder="Here's what's happening this month"/>{!!error&&<Notice danger>{error}</Notice>}<View style={{alignSelf:'flex-start'}}><Button label="Create draft" onPress={()=>void save()}/></View></Card>}
 <Notice>Live sends, scheduling, audience selection, HTML builder and broadcast approval are intentionally unavailable until authentication, domain verification and unsubscribe enforcement are fully wired and tested.</Notice>
 {s.campaigns.length?s.campaigns.map(c=><Card key={c.id} style={{gap:7}}><Text style={styles.cardTitle}>{c.name}</Text><Text style={styles.subheading}>Subject: {c.subject}</Text><Text style={styles.pillText}>{c.status.toUpperCase()} · {c.created_at.slice(0,10)}</Text></Card>):<Card><Text style={styles.subheading}>No campaigns yet. Start with a draft above.</Text></Card>}</View></AppShell>}
