import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OTPScreen from '../screens/OTPScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FundCollectionScreen from '../screens/FundCollectionScreen';
import BlockHousesScreen from '../screens/BlockHousesScreen';
import HouseDetailScreen from '../screens/HouseDetailScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import SponsorsScreen from '../screens/SponsorsScreen';
import AddSponsorScreen from '../screens/AddSponsorScreen';
import ChatScreen from '../screens/ChatScreen';
import MembersScreen from '../screens/MembersScreen';
import QRCodeScreen from '../screens/QRCodeScreen';
import ThemesScreen from '../screens/ThemesScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import MediaScreen from '../screens/MediaScreen';
import TasksScreen from '../screens/TasksScreen';
import VotingPollsScreen from '../screens/VotingPollsScreen';

import { View, ActivityIndicator, Platform } from 'react-native';

const Stack = createStackNavigator();

const screenOptions = {
  headerShown: false,
  gestureEnabled: Platform.OS !== 'web',
  animationEnabled: Platform.OS !== 'web',
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="FundCollection" component={FundCollectionScreen} />
      <Stack.Screen name="BlockHouses" component={BlockHousesScreen} />
      <Stack.Screen name="HouseDetail" component={HouseDetailScreen} />
      <Stack.Screen name="Expenses" component={ExpensesScreen} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Sponsors" component={SponsorsScreen} />
      <Stack.Screen name="AddSponsor" component={AddSponsorScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Members" component={MembersScreen} />
      <Stack.Screen name="QRCode" component={QRCodeScreen} />
      <Stack.Screen name="Themes" component={ThemesScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="Media" component={MediaScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="VotingPolls" component={VotingPollsScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#DC2626' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {currentUser ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
