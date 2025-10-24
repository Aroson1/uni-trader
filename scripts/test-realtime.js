#!/usr/bin/env node

/**
 * Real-time Chat Test Script
 * Tests Supabase real-time functionality for the chat system
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env');
  process.exit(1);
}

console.log('🔄 Testing Supabase real-time connection...');
console.log(`📡 URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

let connectionStatus = 'INITIALIZING';
let testTimeout;

// Test real-time subscription
const channel = supabase
  .channel('realtime-test', {
    config: {
      broadcast: { self: true },
    },
  })
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'messages',
    },
    (payload) => {
      console.log('📨 Real-time event received:', payload.eventType);
    }
  )
  .subscribe((status, err) => {
    connectionStatus = status;
    console.log(`📊 Status: ${status}`);
    
    if (err) {
      console.error('❌ Error:', err);
    }
    
    switch (status) {
      case 'SUBSCRIBED':
        console.log('✅ Real-time is working correctly!');
        console.log('🎉 Your chat should now receive messages in real-time');
        cleanup(0);
        break;
        
      case 'CHANNEL_ERROR':
        console.error('❌ Channel error - real-time publication may not be configured');
        console.error('💡 Solution: Run the real-time migration in Supabase');
        cleanup(1);
        break;
        
      case 'TIMED_OUT':
        console.error('❌ Connection timed out - check your network and Supabase settings');
        cleanup(1);
        break;
        
      case 'CLOSED':
        if (connectionStatus !== 'SUBSCRIBED') {
          console.error('❌ Connection closed before subscribing');
          console.error('💡 Check if real-time is enabled in your Supabase project');
          cleanup(1);
        }
        break;
    }
  });

// Set timeout for the test
testTimeout = setTimeout(() => {
  console.error('⏰ Test timed out after 15 seconds');
  console.error('💡 This usually means real-time is not properly configured');
  cleanup(1);
}, 15000);

function cleanup(exitCode = 0) {
  if (testTimeout) {
    clearTimeout(testTimeout);
  }
  
  console.log('🧹 Cleaning up...');
  supabase.removeChannel(channel);
  
  if (exitCode === 0) {
    console.log('\n✅ Real-time test completed successfully');
  } else {
    console.log('\n❌ Real-time test failed');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check if real-time is enabled in Supabase Dashboard → Database → Replication');
    console.log('2. Ensure messages table is added to the real-time publication');
    console.log('3. Run the real-time migration SQL script');
    console.log('4. Verify your network connection');
  }
  
  process.exit(exitCode);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Test interrupted by user');
  cleanup(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Test terminated');
  cleanup(1);
});