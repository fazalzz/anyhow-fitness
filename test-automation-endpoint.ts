// Test Arkkies Automation Without Being at Gym
// Add this test endpoint to verify the complete flow

export const testAutomationFlow = async (req: AuthRequest, res: Response) => {
  try {
    const { homeOutletId, destinationOutletId, testMode = true }: { 
      homeOutletId: string; 
      destinationOutletId: string; 
      testMode?: boolean;
    } = req.body;
    
    const session = activeSessions.get(req.user!.id);
    
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'No active Arkkies session'
      });
    }

    logger.info(`🧪 TESTING AUTOMATION FLOW: ${homeOutletId} → ${destinationOutletId}`);

    const bookingAutomation = createBookingAutomation(session.cookies || []);
    
    if (!bookingAutomation) {
      return res.status(400).json({
        success: false,
        error: 'Unable to create booking automation - invalid session cookies'
      });
    }

    // Test each step individually to see where it might fail
    const testResults = {
      authentication: { status: 'pending', data: null, error: null },
      monthlyPass: { status: 'pending', data: null, error: null },
      timeSlots: { status: 'pending', data: null, error: null },
      bookingCreation: { status: 'pending', data: null, error: null },
      remoteEntry: { status: 'pending', data: null, error: null }
    };

    // Step 1: Test Authentication
    try {
      const authAPI = createEnhancedArkkiesAPI(session.cookies || []);
      if (authAPI) {
        const authStatus = await authAPI.checkAuthStatus();
        testResults.authentication = { status: 'success', data: authStatus, error: null };
      }
    } catch (error: any) {
      testResults.authentication = { status: 'failed', data: null, error: error.message };
    }

    // Step 2: Test Monthly Pass Detection
    try {
      const monthlyPass = await bookingAutomation.getMonthlySeasonPass(homeOutletId);
      testResults.monthlyPass = { status: 'success', data: monthlyPass, error: null };
    } catch (error: any) {
      testResults.monthlyPass = { status: 'failed', data: null, error: error.message };
    }

    // Step 3: Test Time Slots Availability
    try {
      const todaysDate = new Date().toISOString().split('T')[0];
      const timeSlots = await bookingAutomation.getAvailableTimeSlots(destinationOutletId, todaysDate);
      testResults.timeSlots = { status: 'success', data: timeSlots, error: null };
    } catch (error: any) {
      testResults.timeSlots = { status: 'failed', data: null, error: error.message };
    }

    // Step 4 & 5: Only test booking creation if testMode is false
    if (!testMode) {
      logger.warn('🚨 TEST MODE DISABLED - Will create real booking!');
      
      // This would create an actual booking - only do this if you want a real booking
      const result = await bookingAutomation.bookAndUnlockDoor(homeOutletId, destinationOutletId);
      testResults.bookingCreation = { status: result.success ? 'success' : 'failed', data: result, error: result.success ? null : result.message };
      testResults.remoteEntry = { status: result.success ? 'success' : 'failed', data: result.doorEntryUrl, error: result.success ? null : result.message };
    } else {
      testResults.bookingCreation = { status: 'skipped', data: 'Test mode - no real booking created', error: null };
      testResults.remoteEntry = { status: 'skipped', data: 'Test mode - no real door entry', error: null };
    }

    // Calculate overall readiness
    const passedTests = Object.values(testResults).filter(test => test.status === 'success').length;
    const totalTests = testMode ? 3 : 5; // Skip booking tests in test mode
    const readinessScore = Math.round((passedTests / totalTests) * 100);

    res.json({
      success: true,
      message: `🧪 Automation flow test completed! Readiness: ${readinessScore}%`,
      testMode,
      readinessScore,
      testResults,
      recommendations: generateTestRecommendations(testResults),
      nextSteps: testMode ? [
        'All API tests passed? Try with testMode: false to create a real booking',
        'Failed tests? Check the error messages for troubleshooting',
        'Ready for production? Go to the gym and test the door unlock!'
      ] : [
        'Real booking created? Check the door entry URL',
        'Visit the gym and test the door unlock',
        'Success? Your automation is fully working!'
      ]
    });

  } catch (error: any) {
    logger.error('Automation flow test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Automation flow test failed',
      details: error.message
    });
  }
};

function generateTestRecommendations(testResults: any): string[] {
  const recommendations = [];
  
  if (testResults.authentication.status === 'failed') {
    recommendations.push('❌ Authentication failed - Re-login to Arkkies to refresh your session');
  }
  
  if (testResults.monthlyPass.status === 'failed') {
    recommendations.push('❌ No monthly pass found - Ensure you have an active monthly season pass');
  }
  
  if (testResults.timeSlots.status === 'failed') {
    recommendations.push('❌ Time slots unavailable - Try a different destination outlet or check Arkkies website');
  }
  
  if (testResults.bookingCreation.status === 'failed') {
    recommendations.push('❌ Booking creation failed - Check your monthly pass validity and outlet availability');
  }
  
  if (testResults.remoteEntry.status === 'failed') {
    recommendations.push('❌ Remote entry failed - Booking may have been created but door unlock unavailable');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All tests passed! Your automation should work perfectly');
  }

  return recommendations;
}