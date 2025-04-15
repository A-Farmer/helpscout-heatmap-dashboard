import React from 'react';

const TeamMemberView = ({ 
  heatmapData, 
  uniqueEmails, 
  selectedDay, 
  getColor 
}) => {
  // Format hour for display
  const formatHour = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h} ${ampm}`;
  };

  // Find the maximum value for color scaling for all team members
  const findMaxValue = () => {
    if (!heatmapData[selectedDay]) return 1;
    
    let max = 1;
    uniqueEmails.forEach(email => {
      Object.values(heatmapData[selectedDay]).forEach(hourData => {
        const value = hourData.byEmail[email] || 0;
        if (value > max) max = value;
      });
    });
    
    return max;
  };

  const maxValue = findMaxValue();

  return (
    <div className="mt-4 overflow-x-auto">
      <h2 className="text-lg font-medium mb-2">Team Member View for {selectedDay}</h2>
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="p-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
              Team Member
            </th>
            {Array.from({ length: 24 }).map((_, hour) => (
              <th 
                key={hour} 
                className="p-3 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {formatHour(hour)}
              </th>
            ))}
            <th className="p-3 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {uniqueEmails.map((email, emailIndex) => {
            // Calculate total responses for this team member on the selected day
            let totalResponses = 0;
            if (heatmapData[selectedDay]) {
              Object.values(heatmapData[selectedDay]).forEach(hourData => {
                totalResponses += hourData.byEmail[email] || 0;
              });
            }

            return (
              <tr key={emailIndex}>
                <td className="p-3 border-b border-gray-200 text-sm font-medium sticky left-0 bg-white z-10">
                  {email.split('@')[0]}
                </td>
                {Array.from({ length: 24 }).map((_, hour) => {
                  const value = heatmapData[selectedDay] && 
                    heatmapData[selectedDay][hour] ? 
                    heatmapData[selectedDay][hour].byEmail[email] || 0 : 0;
                  
                  return (
                    <td key={hour} className="p-3 border-b border-gray-200 text-center">
                      <div 
                        className="p-2 rounded-md text-center"
                        style={{
                          backgroundColor: getColor(value, maxValue),
                          color: value > maxValue * 0.6 ? 'white' : 'black',
                          minWidth: '30px'
                        }}
                      >
                        {value || ''}
                      </div>
                    </td>
                  );
                })}
                <td className="p-3 border-b border-gray-200 text-center font-medium">
                  {totalResponses}
                </td>
              </tr>
            );
          })}
          <tr className="bg-gray-50">
            <td className="p-3 border-b border-gray-200 text-sm font-medium sticky left-0 bg-gray-50 z-10">
              Hour Totals
            </td>
            {Array.from({ length: 24 }).map((_, hour) => {
              const hourTotal = heatmapData[selectedDay] && 
                heatmapData[selectedDay][hour] ? 
                heatmapData[selectedDay][hour].total : 0;
              
              return (
                <td key={hour} className="p-3 border-b border-gray-200 text-center font-medium">
                  {hourTotal}
                </td>
              );
            })}
            <td className="p-3 border-b border-gray-200 text-center font-medium">
              {/* Calculate grand total */}
              {heatmapData[selectedDay] ? 
                Object.values(heatmapData[selectedDay]).reduce((sum, hourData) => sum + hourData.total, 0) : 0}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default TeamMemberView;