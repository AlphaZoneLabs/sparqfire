import { Image, Text, View } from 'react-native';
import { colors } from '../theme';
// Existing root-level assets are intentionally reused, not re-created or overwritten.
const logo = require('../../assets/brand/sparqfireLogo.png');
const icon = require('../../assets/brand/sparqfireIcon.png');
export function Brand({compact=false}:{compact?:boolean}) {return <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Image source={icon} resizeMode="contain" style={{height:36,width:36}} accessibilityLabel="SparQFire icon" />{!compact && <Image source={logo} resizeMode="contain" style={{height:42,width:148}} accessibilityLabel="SparQFire logo" />}</View>}
export function MiniBrand() {return <View style={{flexDirection:'row',gap:8,alignItems:'center'}}><Image source={icon} style={{height:23,width:23}} resizeMode="contain"/><Text style={{color:colors.text,fontWeight:'700',fontSize:16}}>SparQFire</Text></View>}
