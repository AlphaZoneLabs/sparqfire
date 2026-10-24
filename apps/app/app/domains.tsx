import React,{useState} from 'react';
import { Text,View } from 'react-native';
import { AppShell,WorkspaceSelect } from '../src/components/AppShell';
import { Button,Card,Field,Notice,PageHeading } from '../src/components/ui';
import { styles } from '../src/theme';
import { useAppState } from '../src/state/AppState';
export default function Domains(){const s=useAppState(),[open,setOpen]=useState(false),[hostname,setHostname]=useState(''),[error,setError]=useState('');
 async function save(){try{await s.addDomain(hostname.trim().toLowerCase());setHostname('');setError('');setOpen(false)}catch(e){setError((e as Error).message)}}
 return <AppShell><View style={styles.section}><PageHeading title="Sending domains" detail="Register the domains you control, then configure authentication before sending."/><WorkspaceSelect/><View style={{alignSelf:'flex-start'}}><Button label={open?'Cancel':'+ Add domain'} onPress={()=>setOpen(!open)} disabled={!s.activeId}/></View>
 {open&&<Card style={{gap:12}}><Field label="Domain or sending subdomain" value={hostname} onChangeText={setHostname} placeholder="news.yourclient.com"/><Notice>Adding a domain is not verification. DNS records and sender verification will be implemented next. Do not change existing MX records used for your client's inbox.</Notice>{!!error&&<Notice danger>{error}</Notice>}<View style={{alignSelf:'flex-start'}}><Button label="Register pending domain" onPress={()=>void save()}/></View></Card>}
 {s.domains.length?s.domains.map(d=><Card key={d.id} style={{gap:9}}><Text style={styles.cardTitle}>{d.hostname}</Text><Text style={styles.pillText}>{d.status.toUpperCase()} · Not approved for live sending</Text></Card>):<Card><Text style={styles.subheading}>No domains registered for this client.</Text></Card>}</View></AppShell>}
