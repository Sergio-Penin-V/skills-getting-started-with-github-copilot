document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select so options don't accumulate on repeated fetches
      if (activitySelect) {
        activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // We'll render a participants container programmatically so we can add delete buttons
        const participants = details.participants || [];
        const participantsContainerHtml = `<div class="participants-section">\
           <h5 class="participants-title">Participants</h5>\
           <div class="participants-container"></div>\
         </div>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsContainerHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Fill participants container with chips + delete icon
        const container = activityCard.querySelector('.participants-container');
        if (participants.length === 0) {
          const p = document.createElement('p');
          p.className = 'participants-empty';
          p.textContent = 'No participants yet. Be the first to sign up!';
          container.appendChild(p);
        } else {
          participants.forEach(pEmail => {
            const chip = document.createElement('div');
            chip.className = 'participant-chip';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'participant-name';
            nameSpan.innerHTML = escapeHtml(pEmail);

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'participant-delete';
            delBtn.setAttribute('aria-label', `Remove ${pEmail} from ${name}`);
            delBtn.innerHTML = '&times;';

            delBtn.addEventListener('click', async () => {
              // Confirm briefly (optional)
              if (!confirm(`Unregister ${pEmail} from ${name}?`)) return;

              try {
                const resp = await fetch(`/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(pEmail)}`, {
                  method: 'POST'
                });

                const resJson = await resp.json();
                if (resp.ok) {
                  messageDiv.textContent = resJson.message;
                  messageDiv.className = 'message success';
                  messageDiv.classList.remove('hidden');
                  // refresh activities to show updated list
                  fetchActivities();
                } else {
                  messageDiv.textContent = resJson.detail || 'Failed to unregister';
                  messageDiv.className = 'message error';
                  messageDiv.classList.remove('hidden');
                }

                setTimeout(() => messageDiv.classList.add('hidden'), 4000);
              } catch (err) {
                console.error('Error unregistering:', err);
                messageDiv.textContent = 'Failed to unregister. Try again.';
                messageDiv.className = 'message error';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 4000);
              }
            });

            chip.appendChild(nameSpan);
            chip.appendChild(delBtn);
            container.appendChild(chip);
          });
        }

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = 'message success';
        signupForm.reset();
        // Refresh activities so the UI reflects the new participant immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = 'message error';
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = 'message error';
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

// Add a small helper to escape HTML in participant strings
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
