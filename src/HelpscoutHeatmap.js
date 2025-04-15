import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import TeamMemberView from './TeamMemberView';
import UserWeeklyView from './UserWeeklyView';

// Multi-File Upload Component
const FileUpload = ({ onFilesLoaded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setIsLoading(true);
      setUploadedFiles(prev => [...prev, ...files.map(file => ({ name: file.name, status: 'pending' }))]);
      
      const filePromises = files.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onload = (event) => {
            resolve({
              name: file.name,
              content: event.target.result
            });
          };
          
          reader.onerror = () => {
            reject(new Error(`Error reading file: ${file.name}`));
          };
          
          reader.readAsText(file);
        });
      });
      
      Promise.all(filePromises)
        .then(results => {
          // Update the file status to 'loaded'
          setUploadedFiles(prev => prev.map(file => {
            if (results.some(r => r.name === file.name)) {
              return { ...file, status: 'loaded' };
            }
            return file;
          }));
          
          onFilesLoaded(results);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error reading files:', error);
          setIsLoading(false);
        });
    }
  };

  const handleRemoveFile = (fileName) => {
    setUploadedFiles(prev => prev.filter(file => file.name !== fileName));
  };

  return (
    <div className="file-upload mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload Helpscout CSV Files:
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
      {isLoading && <p className="mt-2 text-sm text-gray-500">Loading files...</p>}
      
      {/* Display uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</h3>
          <ul className="bg-gray-50 rounded-md p-2">
            {uploadedFiles.map((file, index) => (
              <li key={index} className="flex justify-between items-center py-1">
                <div className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${file.status === 'loaded' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                  <span className="text-sm">{file.name}</span>
                </div>
                <button 
                  onClick={() => handleRemoveFile(file.name)} 
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const HelpscoutHeatmap = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [data, setData] = useState([]);
  const [heatmapData, setHeatmapData] = useState({});
  const [uniqueEmails, setUniqueEmails] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedEmail, setSelectedEmail] = useState('all');
  const [availableDates, setAvailableDates] = useState([]);
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [viewMode, setViewMode] = useState('hourly'); // 'hourly', 'team', or 'user'
  const [uploadedFilesInfo, setUploadedFilesInfo] = useState([]);

  // Color scale for heatmap (from light to dark blue)
  const getColor = (value, max) => {
    if (value === 0) return '#f5f5f5';
    const intensity = Math.min(Math.max(Math.floor((value / max) * 9), 1), 9);
    return `rgba(33, 150, 243, 0.${intensity})`;
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
              // Add source file for tracking
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

  // Handle multiple file uploads
  const handleFilesLoaded = (files) => {
    setLoading(true);
    
    const processPromises = files.map(file => processFile(file.content, file.name));
    
    Promise.all(processPromises)
      .then(results => {
        // Merge all processed data
        const allData = results.flatMap(result => result.data);
        
        // Track file info for display
        const fileInfo = results.map(result => ({
          name: result.fileName,
          count: result.count
        }));
        
        // Update uploaded files list
        setUploadedFilesInfo(prev => {
          // Filter out existing files with the same name
          const newPrev = prev.filter(p => !fileInfo.some(f => f.name === p.name));
          return [...newPrev, ...fileInfo];
        });
        
        // Merge with existing data if any
        setData(prev => {
          // Remove data from files that are being re-uploaded
          const fileNames = files.map(f => f.name);
          const filteredPrev = prev.filter(row => !fileNames.includes(row.sourceFile));
          return [...filteredPrev, ...allData];
        });
        
        // Get unique emails from all data
        const allEmails = Array.from(new Set(allData.map(row => row.email))).filter(email => email);
        
        setUniqueEmails(prev => {
          const uniqueSet = new Set([...prev, ...allEmails]);
          return Array.from(uniqueSet);
        });
        
        // Update data loaded flag
        setDataLoaded(true);
        
        // Update available dates, min/max date, and week ranges
        updateDateRanges();
        
        setLoading(false);
      })
      .catch(error => {
        console.error('Error processing files:', error);
        alert(error.message);
        setLoading(false);
      });
  };

  // Update date ranges based on all loaded data
  const updateDateRanges = () => {
    // Calculate this based on merged data
    const dates = data.map(row => row.date);
    
    if (dates.length === 0) {
      setAvailableDates([]);
      setDateRange({ start: '', end: '' });
      setMinDate('');
      setMaxDate('');
      setWeeks([]);
      setSelectedWeek('');
      return;
    }
    
    const min = dates.reduce((a, b) => a < b ? a : b);
    const max = dates.reduce((a, b) => a > b ? a : b);
    
    // Group dates by week for selection dropdown
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
    
    // Set state with new date ranges
    setAvailableDates([...new Set(dates)].sort());
    setDateRange({ start: min, end: max });
    setMinDate(min);
    setMaxDate(max);
    setWeeks(weekOptions);
    setSelectedWeek(weekOptions.length > 0 ? weekOptions[weekOptions.length - 1].value : '');
    
    // Initial filter with all data
    filterData(data, [...uniqueEmails, ...Array.from(new Set(data.map(row => row.email))).filter(email => email)], { start: min, end: max }, 'all');
  };

  // Clear all loaded data
  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all loaded data?')) {
      setData([]);
      setHeatmapData({});
      setUniqueEmails([]);
      setDateRange({ start: '', end: '' });
      setAvailableDates([]);
      setMinDate('');
      setMaxDate('');
      setWeeks([]);
      setSelectedWeek('');
      setUploadedFilesInfo([]);
      setDataLoaded(false);
    }
  };

  // Remove a specific uploaded file
  const handleRemoveFile = (fileName) => {
    if (window.confirm(`Are you sure you want to remove ${fileName}?`)) {
      // Filter out the data from this file
      const newData = data.filter(item => item.sourceFile !== fileName);
      setData(newData);
      
      // Update uploaded files info
      setUploadedFilesInfo(prev => prev.filter(file => file.name !== fileName));
      
      if (newData.length === 0) {
        // If no data left, reset everything
        setDataLoaded(false);
        setHeatmapData({});
        setUniqueEmails([]);
        setDateRange({ start: '', end: '' });
        setAvailableDates([]);
        setMinDate('');
        setMaxDate('');
        setWeeks([]);
        setSelectedWeek('');
      } else {
        // Recalculate unique emails, date ranges, etc.
        const emails = Array.from(new Set(newData.map(row => row.email))).filter(email => email);
        setUniqueEmails(emails);
        
        // Update date ranges with the remaining data
        const dates = newData.map(row => row.date);
        const min = dates.reduce((a, b) => a < b ? a : b);
        const max = dates.reduce((a, b) => a > b ? a : b);
        
        setDateRange({ start: min, end: max });
        setMinDate(min);
        setMaxDate(max);
        
        // Regroup dates by week
        const weekGroups = _.groupBy(
          _.uniq(dates).sort(), 
          date => {
            const d = new Date(date);
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
        
        setAvailableDates([...new Set(dates)].sort());
        setWeeks(weekOptions);
        setSelectedWeek(weekOptions.length > 0 ? weekOptions[weekOptions.length - 1].value : '');
        
        // Refilter the data
        filterData(newData, emails, { start: min, end: max }, selectedEmail);
      }
    }
  };

  // Handle week selection
  useEffect(() => {
    if (selectedWeek && data.length > 0) {
      const [start, end] = selectedWeek.split('|');
      filterData(data, uniqueEmails, { start, end }, selectedEmail);
    }
  }, [selectedWeek, selectedEmail]);

  // Filter data based on selected email and date range
  const filterData = (processedData, emails, range, email) => {
    // Filter by date range and email if specified
    const filtered = processedData.filter(row => {
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

  // Loading state
  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const maxValue = findMaxValue();

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Support Team Response Heatmap</h1>
      
      {/* File Upload Section - Always visible */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-medium">Data Source</h2>
          {uploadedFilesInfo.length > 0 && (
            <button 
              onClick={handleClearAllData} 
              className="text-xs text-red-500 hover:text-red-700 p-1 border border-red-300 rounded"
            >
              Clear All Data
            </button>
          )}
        </div>
        
        <p className="mb-4">
          Upload one or more CSV files with support team responses data. Each file must include:
        </p>
        <ul className="list-disc ml-6 mb-4">
          <li><strong>created_at_est</strong> - Timestamp of when the response was sent (format: YYYY-MM-DDTHH:MM:SS)</li>
          <li><strong>user_email</strong> - Email of the support representative who sent the response</li>
        </ul>
        
        <FileUpload onFilesLoaded={handleFilesLoaded} />
        
        {/* Display uploaded files information */}
        {uploadedFilesInfo.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium mb-2">Uploaded Data Sources:</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">File Name</th>
                    <th className="p-2 text-right">Responses</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedFilesInfo.map((file, index) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="p-2">{file.name}</td>
                      <td className="p-2 text-right">{file.count.toLocaleString()}</td>
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
                  <tr className="border-t border-gray-200 font-medium">
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right">{uploadedFilesInfo.reduce((sum, file) => sum + file.count, 0).toLocaleString()}</td>
                    <td className="p-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {dataLoaded && (
        <>
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
                <p className="font-medium">{data.length.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HelpscoutHeatmap;