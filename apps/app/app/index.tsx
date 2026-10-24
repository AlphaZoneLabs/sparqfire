import React from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppShell, WorkspaceSelect } from '../src/components/AppShell';
import { Card, Button, Notice, PageHeading } from '../src/components/ui';
import { colors, styles } from '../src/theme';
import { useAppState } from '../src/state/AppState';
export default function Overview(){const s=useAppState(),router=useRouter(),{width}=useWindowDimensions();const columns=width>1050?4:2;
 const metrics=[{title:'Client workspaces',value:s.workspaces.length,icon:'business-outline'},{title:'Contacts in view',value:s.contacts.length,icon:'people-outline'},{title:'Draft campaigns',value:s.campaigns.filter(c=>c.status==='draft').length,icon:'mail-outline'},{title:'Verified domains',value:s.domains.filter(d=>d.status==='verified').length,icon:'shield-checkmark-outline'}] as const;
 return <AppShell><View style={styles.section}><PageHeading title="Overview" detail="Manage every client's marketing from one secure control center."/>{s.demo&&<Notice>Sample data only. Nothing here is sent or saved to Cloudflare. Sign in when your Worker backend is configured.</Notice>}<WorkspaceSelect/>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{metrics.map(m=><Card key={m.title} style={{width:columns===4?'23.4%':'48%',minWidth:140,flexGrow:1,gap:11}}><Ionicons name={m.icon} size={24} color={colors.accent}/><Text style={styles.label}>{m.title}</Text><Text style={{fontSize:30,fontWeight:'800',color:colors.text}}>{m.value.toLocaleString()}</Text></Card>)}</View>
 <Card style={{gap:13}}><Text style={styles.cardTitle}>Quick actions</Text><Text style={styles.subheading}>Start with a client, then organize contacts and create a draft campaign.</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}><Button label="Manage clients" onPress={()=>router.push('/clients' as never)}/><Button label="New campaign" secondary onPress={()=>router.push('/campaigns' as never)}/></View></Card>
 <Card style={{gap:14}}><Text style={styles.cardTitle}>Campaign activity</Text>{s.campaigns.length?s.campaigns.slice(0,5).map(c=><View key={c.id} style={{flexDirection:'row',justifyContent:'space-between',gap:12,alignItems:'center',paddingVertical:9,borderBottomWidth:1,borderBottomColor:colors.border}}><View style={{flex:1,gap:3}}><Text style={{color:colors.text,fontWeight:'600'}}>{c.name}</Text><Text style={styles.label}>{c.subject}</Text></View><Text style={styles.pillText}>{c.status.toUpperCase()}</Text></View>):<Text style={styles.subheading}>No campaigns for this client yet.</Text>}</Card></View></AppShell>}
