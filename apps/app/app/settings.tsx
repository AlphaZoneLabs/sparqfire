import React from 'react';
import { Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../src/components/AppShell';
import { Button,Card,Notice,PageHeading } from '../src/components/ui';
import { styles } from '../src/theme';
import { useAppState } from '../src/state/AppState';
export default function Settings(){const s=useAppState(),router=useRouter();return <AppShell><View style={styles.section}><PageHeading title="Settings" detail="Workspace access, environment status and security."/><Card style={{gap:12}}><Text style={styles.cardTitle}>Session</Text><Text style={styles.subheading}>{s.demo?'Previewing demo data':'Signed in as '+s.user?.email}</Text>{s.demo?<Button label="Sign in to your Worker" onPress={()=>router.push('/login' as never)}/>:<Button label="Sign out" secondary onPress={()=>void s.logout()}/>}</Card><Card style={{gap:12}}><Text style={styles.cardTitle}>Foundation capabilities</Text><Text style={styles.subheading}>Email/password authentication is provided by the Worker. Google sign-in, optional 2FA, roles UI, delivery providers and campaign sending need additional implementations before production use.</Text></Card><Notice>Demo data is for interface evaluation only. It is never synced to your client's real lists.</Notice></View></AppShell>}
