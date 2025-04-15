import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import TeamMemberView from './TeamMemberView';
import UserWeeklyView from './UserWeeklyView';

// File Upload Page Component
const FileUploadPage = ({ onSubmitFiles }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Add new files to the pending list
      setPendingFiles(prev => [
        ...prev,
        ...files.map(file => ({ 
          file, 
          name: file.name, 
          status: 'pending',
          size: (file.size / 1024).toFixed(1) + ' KB'
        }))
      ]);
    }
  };

  const handleRemoveFile = (fileName) => {
    setPendingFiles(prev => prev.filter(file => file.name !== fileName));
  };

  const handleSubmit = async () => {
    if (pendingFiles.length === 0) {
      setErrorMessage('Please upload at least one file before submitting.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const fileContents = await Promise.all(
        pendingFiles.map(fileInfo => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
              resolve({
                name: fileInfo.name,
                content: event.target.result
              });
            };
            
            reader.onerror = () => {
              reject(new Error(`Error reading file: ${fileInfo.name}`));
            };
            
            reader.readAsText(fileInfo.file);
          });
        })
      );
      
      onSubmitFiles(fileContents);
    } catch (error) {
      console.error('Error reading files:', error);
      setErrorMessage(`Error reading files: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Support Team Response Heatmap</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-4">Upload Data Files</h2>
        
        <p className="mb-4">
          Upload one or more CSV files with support team responses data. Each file must include:
        </p>
        <ul className="list-disc ml-6 mb-4">
          <li><strong>created_at_est</strong> - Timestamp of when the response was sent (format: YYYY-MM-DDTHH:MM:SS)</li>
          <li><strong>user_email</strong> - Email of the support representative who sent the response</li>
        </ul>
        
        <div className="file-upload mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Helpscout CSV Files:
          </label>
          <input
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>
        
        {/* Display pending files */}
        {pendingFiles.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Files to Process:</h3>
            <div className="bg-gray-50 rounded-md p-3">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-2">File Name</th>
                    <th className="text-right p-2">Size</th>
                    <th className="text-right p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingFiles.map((file, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="p-2">{file.name}</td>
                      <td className="p-2 text-right">{file.size}</td>
                      <td className="p-2 text-right">
                        <button 
                          onClick={() => handleRemoveFile(file.name)} 
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md">
            {errorMessage}
          </div>
        )}
        
        <div className="flex justify-center">
          <button 
            onClick={handleSubmit}
            disabled={isLoading || pendingFiles.length === 0}
            className={`px-6 py-3 rounded-md text-white font-medium shadow-sm
              ${isLoading || pendingFiles.length === 0 
                ? 'bg-gray-400 opacity-70 cursor-not-allowed border border-gray-300' 
                : 'bg-blue-600 hover:bg-blue-700 border border-blue-700'}`}
          >
            {isLoading ? 'Processing...' : 'Process Files'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ 
  processedData, 
  uploadedFilesInfo, 
  onReset 
}) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [heatmapData, setHeatmapData] = useState({});
  const [uniqueEmails, setUniqueEmails] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedEmail, setSelectedEmail] = useState('all');
  const [availableDates, setAvailableDates] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [viewMode, setViewMode] = useState('hourly'); // 'hourly', 'team', or 'user'

  // Initialize dashboard when data is loaded
  useEffect(() => {
    if (processedData.length > 0) {
      initializeDashboard();
    }
  }, [processedData]);

  // Initialize the dashboard with the processed data
  const initializeDashboard = () => {
    setLoading(true);
    
    try {
      // Extract unique emails
      const emails = Array.from(new Set(processedData.map(row => row.email))).filter(email => email);
      setUniqueEmails(emails);
      
      // Calculate date ranges
      const dates = processedData.map(row => row.date);
      const min = dates.reduce((a, b) => a < b ? a : b);
      const max = dates.reduce((a, b) => a > b ? a : b);
      
      setDateRange({ start: min, end: max });
      setAvailableDates([...new Set(dates)].sort());
      
      // Group dates by week
      const weekGroups = _.groupBy(
        _.uniq(dates).sort(), 
        date => {
          const d = new Date(date);
          // Get the Sunday of the week
          const day = d.getDay();
          const diff = d.getDate() - day;
          const sunday = new Date(d.setDate(diff));
          return sunday.toISOString().split('T')[0];
        }
      );
      
      const weekOptions = Object.keys(weekGroups).map(weekStart => {
        const lastDay = weekGroups[weekStart][weekGroups[weekStart].length - 1];
        return {
          value: `${weekStart}|${lastDay}`,
          label: `${weekStart} to ${lastDay}`
        };
      });
      
      setWeeks(weekOptions);
      
      // Set the most recent week as the default selected week
      if (weekOptions.length > 0) {
        setSelectedWeek(weekOptions[weekOptions.length - 1].value);
        
        // Filter data for the selected week
        const [start, end] = weekOptions[weekOptions.length - 1].value.split('|');
        filterData(processedData, emails, { start, end }, 'all');
      } else {
        // If no weeks (shouldn't happen), just filter with full date range
        filterData(processedData, emails, { start: min, end: max }, 'all');
      }
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    }
    
    setLoading(false);
  };

  // Handle week selection change
  useEffect(() => {
    if (selectedWeek && processedData.length > 0) {
      const [start, end] = selectedWeek.split('|');
      filterData(processedData, uniqueEmails, { start, end }, selectedEmail);
    }
  }, [selectedWeek, selectedEmail]);

  // Color scale for heatmap (from light to dark blue)
  const getColor = (value, max) => {
    if (value === 0) return '#f5f5f5';
    const intensity = Math.min(Math.max(Math.floor((value / max) * 9), 1), 9);
    return `rgba(33, 150, 243, 0.${intensity})`;
  };

  // Filter data based on selected email and date range
  const filterData = (data, emails, range, email) => {
    // Filter by date range and email if specified
    const filtered = data.filter(row => {
      const dateInRange = row.date >= range.start && row.date <= range.end;
      const emailMatch = email === 'all' || row.email === email;
      return dateInRange && emailMatch;
    });
    
    // Group by day and hour
    const heatmap = {};
    
    // Initialize the structure
    for (let day = 0; day < 7; day++) {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
      heatmap[dayName] = {};
      
      for (let hour = 0; hour < 24; hour++) {
        heatmap[dayName][hour] = {
          total: 0,
          byEmail: {}
        };
        
        // Initialize counts for each email
        emails.forEach(email => {
          heatmap[dayName][hour].byEmail[email] = 0;
        });
      }
    }
    
    // Populate the heatmap data
    filtered.forEach(row => {
      const { dayName, hour, email } = row;
      
      if (email) {
        heatmap[dayName][hour].total += 1;
        heatmap[dayName][hour].byEmail[email] = (heatmap[dayName][hour].byEmail[email] || 0) + 1;
      }
    });
    
    setHeatmapData(heatmap);
  };

  // Find the maximum value for color scaling
  const findMaxValue = () => {
    if (!heatmapData[selectedDay]) return 1;
    
    return Math.max(
      1,
      ...Object.values(heatmapData[selectedDay]).map(hourData => 
        selectedEmail === 'all' ? hourData.total : hourData.byEmail[selectedEmail] || 0
      )
    );
  };

  // Format hour for display
  const formatHour = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h} ${ampm}`;
  };

  // Get cell value based on selected email
  const getCellValue = (dayData, hour) => {
    if (!dayData[hour]) return 0;
    return selectedEmail === 'all' ? dayData[hour].total : dayData[hour].byEmail[selectedEmail] || 0;
  };

  // Handle email selection change
  const handleEmailChange = (e) => {
    setSelectedEmail(e.target.value);
    // If switching to user view, ensure a specific email is selected
    if (viewMode === 'user' && e.target.value === 'all') {
      // If selecting 'all' in user view, switch back to hourly view
      setViewMode('hourly');
    }
  };

  // Handle week selection change
  const handleWeekChange = (e) => {
    setSelectedWeek(e.target.value);
  };

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    // If switching to user view, ensure a specific email is selected
    if (mode === 'user' && selectedEmail === 'all') {
      alert('Please select a specific team member to view their weekly pattern.');
      return;
    }
    setViewMode(mode);
  };

  // Return to upload page
  const handleReturnToUpload = () => {
    if (window.confirm('Return to file upload page? This will reset the current dashboard.')) {
      onReset();
    }
  };

  // Loading state
  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;
  }

  const maxValue = findMaxValue();

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Support Team Response Heatmap</h1>
        <button 
          onClick={handleReturnToUpload}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          Return to File Upload
        </button>
      </div>
      
      {/* Data Source Summary */}
      <div className="mb-6 p-3 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium mb-2">Data Sources:</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">File Name</th>
                <th className="p-2 text-right">Responses</th>
              </tr>
            </thead>
            <tbody>
              {uploadedFilesInfo.map((file, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="p-2">{file.name}</td>
                  <td className="p-2 text-right">{file.count.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-200 font-medium">
                <td className="p-2">Total</td>
                <td className="p-2 text-right">{uploadedFilesInfo.reduce((sum, file) => sum + file.count, 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Week Range:</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={selectedWeek}
            onChange={handleWeekChange}
          >
            {weeks.map((week, index) => (
              <option key={index} value={week.value}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Support Rep:</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={selectedEmail}
            onChange={handleEmailChange}
            disabled={viewMode === 'team'}
          >
            <option value="all" disabled={viewMode === 'user'}>All Team Members</option>
            {uniqueEmails.map((email, index) => (
              <option key={index} value={email}>
                {email.split('@')[0]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">View Mode:</label>
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              className={`flex-1 py-2 px-4 focus:outline-none ${
                viewMode === 'hourly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleViewModeChange('hourly')}
            >
              Hourly
            </button>
            <button
              className={`flex-1 py-2 px-4 focus:outline-none ${
                viewMode === 'team'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleViewModeChange('team')}
            >
              Team
            </button>
            <button
              className={`flex-1 py-2 px-4 focus:outline-none ${
                viewMode === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleViewModeChange('user')}
            >
              User Week
            </button>
          </div>
        </div>
      </div>
      
      {/* Day tabs - Only show for hourly and team views */}
      {viewMode !== 'user' && (
        <div className="mb-4 border-b border-gray-200">
          <ul className="flex flex-wrap -mb-px">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <li key={day} className="mr-2">
                <button
                  className={`inline-block p-4 ${
                    selectedDay === day
                      ? 'text-blue-600 border-b-2 border-blue-600 rounded-t-lg active'
                      : 'border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedDay(day)}
                >
                  {day}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Heatmap Legend */}
      <div className="flex items-center mb-4">
        <div className="mr-2 text-sm font-medium text-gray-500">Low</div>
        <div className="flex h-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((intensity) => (
            <div
              key={intensity}
              style={{
                backgroundColor: `rgba(33, 150, 243, 0.${intensity})`,
                width: '20px',
                height: '16px'
              }}
            ></div>
          ))}
        </div>
        <div className="ml-2 text-sm font-medium text-gray-500">High</div>
      </div>
      
      {/* View Content */}
      {viewMode === 'hourly' && (
        // Hourly View
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="p-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hour
                </th>
                <th className="p-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responses
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 24 }).map((_, hour) => (
                <tr key={hour}>
                  <td className="p-3 border-b border-gray-200 text-sm">
                    {formatHour(hour)}
                  </td>
                  <td className="p-3 border-b border-gray-200">
                    <div
                      className="p-3 rounded-md text-center font-medium"
                      style={{
                        backgroundColor: getColor(
                          getCellValue(heatmapData[selectedDay] || {}, hour),
                          maxValue
                        ),
                        color: getCellValue(heatmapData[selectedDay] || {}, hour) > maxValue * 0.6 ? 'white' : 'black'
                      }}
                    >
                      {getCellValue(heatmapData[selectedDay] || {}, hour)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {viewMode === 'team' && (
        // Team Member View
        <TeamMemberView 
          heatmapData={heatmapData} 
          uniqueEmails={uniqueEmails} 
          selectedDay={selectedDay}
          getColor={getColor}
        />
      )}
      
      {viewMode === 'user' && (
        // User Weekly View
        <UserWeeklyView 
          heatmapData={heatmapData}
          selectedEmail={selectedEmail}
          getColor={getColor}
        />
      )}
      
      {/* Summary stats */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h2 className="text-lg font-medium mb-2">Data Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Date Range</p>
            <p className="font-medium">{dateRange.start} to {dateRange.end}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Team Members</p>
            <p className="font-medium">{uniqueEmails.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Responses</p>
            <p className="font-medium">{processedData.length.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main HelpscoutHeatmap Component
const HelpscoutHeatmap = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [processedData, setProcessedData] = useState([]);
  const [uploadedFilesInfo, setUploadedFilesInfo] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle file submission from upload page
  const handleSubmitFiles = async (files) => {
    setIsProcessing(true);
    
    try {
      const fileResults = await Promise.all(
        files.map(file => processFile(file.content, file.name))
      );
      
      // Combine all processed data
      const allData = fileResults.flatMap(result => result.data);
      
      // Save file info for display
      const fileInfo = fileResults.map(result => ({
        name: result.fileName,
        count: result.count
      }));
      
      setProcessedData(allData);
      setUploadedFilesInfo(fileInfo);
      setShowDashboard(true);
    } catch (error) {
      console.error('Error processing files:', error);
      alert(`Error processing files: ${error.message}`);
    }
    
    setIsProcessing(false);
  };

  // Process a single file
  const processFile = (csvData, fileName) => {
    return new Promise((resolve, reject) => {
      Papa.parse(csvData, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimitersToGuess: [',', '\t', '|', ';'],
        complete: (results) => {
          // Check if required columns exist
          const hasCreatedAt = results.meta.fields.includes('created_at_est');
          const hasUserEmail = results.meta.fields.includes('user_email');
          
          if (!hasCreatedAt || !hasUserEmail) {
            reject(new Error(`${fileName} must contain created_at_est and user_email columns`));
            return;
          }
          
          // Filter to only include rows with user_email (support team responses)
          const supportResponses = results.data.filter(row => row.user_email !== null);
          
          // Process the data
          const processedData = supportResponses.map(row => {
            const dateTime = new Date(row.created_at_est);
            return {
              email: row.user_email,
              date: dateTime.toISOString().split('T')[0], // YYYY-MM-DD
              dayOfWeek: dateTime.getDay(), // 0-6 (Sunday-Saturday)
              dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateTime.getDay()],
              hour: dateTime.getHours(),
              timestamp: dateTime.getTime(),
              sourceFile: fileName
            };
          });
          
          resolve({
            data: processedData,
            count: processedData.length,
            fileName: fileName
          });
        },
        error: (error) => {
          reject(new Error(`Error parsing CSV ${fileName}: ${error}`));
        }
      });
    });
  };

  // Reset the app to upload page
  const handleReset = () => {
    setShowDashboard(false);
    setProcessedData([]);
    setUploadedFilesInfo([]);
  };

  // Processing state
  if (isProcessing) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="mb-4 text-lg">Processing files...</div>
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Show either upload page or dashboard based on state
  return (
    <>
      {!showDashboard ? (
        <FileUploadPage onSubmitFiles={handleSubmitFiles} />
      ) : (
        <Dashboard 
          processedData={processedData}
          uploadedFilesInfo={uploadedFilesInfo}
          onReset={handleReset}
        />
      )}
    </>
  );
};

export default HelpscoutHeatmap;